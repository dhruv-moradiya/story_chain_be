import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { AppError } from '@infrastructure/errors/app-error';
import { UserService } from '@features/user/services/user.service';
import { CommentRepository } from '@features/comment/repositories/comment.repository';
import { ChapterRepository } from '@features/chapter/repositories/chapter.repository';
import { StoryRepository } from '@features/story/repositories/story.repository';
import { StoryBanRepository } from '@features/storyBan/repositories/storyBan.repository';
import { ReportRepository } from '../repositories/report.repository';
import { IReport } from '../types/report.types';
import { ReportStatus, ReportActionTaken } from '../types/report-enum';
import {
  TPlatformResolveReportInput,
  TResolveStoryReportInput,
} from '@/schema/request/report.schema';

@singleton()
export class ReportResolutionService extends BaseModule {
  constructor(
    @inject(TOKENS.ReportRepository)
    private readonly reportRepository: ReportRepository,
    @inject(TOKENS.StoryBanRepository)
    private readonly storyBanRepository: StoryBanRepository,
    @inject(TOKENS.UserService)
    private readonly userService: UserService,
    @inject(TOKENS.CommentRepository)
    private readonly commentRepository: CommentRepository,
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepository: ChapterRepository,
    @inject(TOKENS.StoryRepository)
    private readonly storyRepository: StoryRepository
  ) {
    super();
  }

  private async resolveTargetUserId(report: IReport): Promise<string | undefined> {
    if (report.relatedUserId) {
      return report.relatedUserId;
    }
    if (report.relatedCommentId) {
      const comment = await this.commentRepository.getCommentById(
        report.relatedCommentId.toString()
      );
      if (comment) return comment.userId;
    }
    if (report.relatedChapterSlug) {
      const chapter = await this.chapterRepository.findBySlug(report.relatedChapterSlug);
      if (chapter) return chapter.authorId;
    }
    if (report.relatedStorySlug) {
      const story = await this.storyRepository.findBySlug(report.relatedStorySlug);
      if (story) return story.creatorId;
    }
    return undefined;
  }

  private async executeReportAction(
    report: IReport,
    actionTaken: ReportActionTaken,
    reviewerId: string,
    resolution: string,
    overrideStorySlug?: string
  ): Promise<{ storyBanId?: string; banHistoryId?: string }> {
    let storyBanId: string | undefined;
    let banHistoryId: string | undefined;

    console.log('----------');
    console.log('actionTaken', actionTaken);
    console.log('----------');

    if (actionTaken === ReportActionTaken.NONE) {
      return {};
    }

    const targetUserId = await this.resolveTargetUserId(report);

    switch (actionTaken) {
      case ReportActionTaken.DELETE_COMMENT: {
        if (report.relatedCommentId) {
          await this.commentRepository.deleteComment(report.relatedCommentId.toString());
        }
        break;
      }

      case ReportActionTaken.FLAG_CHAPTER: {
        if (report.relatedChapterSlug) {
          await this.chapterRepository.updateMany(
            { slug: report.relatedChapterSlug },
            { isFlagged: true }
          );
        }
        break;
      }

      case ReportActionTaken.DELETE_CONTENT: {
        if (report.relatedCommentId) {
          await this.commentRepository.deleteComment(report.relatedCommentId.toString());
        }
        if (report.relatedChapterSlug) {
          await this.chapterRepository.updateMany(
            { slug: report.relatedChapterSlug },
            { isFlagged: true }
          );
        }
        break;
      }

      case ReportActionTaken.BAN_FROM_STORY: {
        const targetStorySlug = overrideStorySlug || report.relatedStorySlug;
        if (targetUserId && targetStorySlug) {
          const storyBan = await this.storyBanRepository.banUserFromStory({
            storySlug: targetStorySlug,
            userId: targetUserId,
            bannedBy: reviewerId,
            bannedByRole: 'moderator',
            reason: resolution,
            reportId: report._id,
          });

          if (storyBan) {
            storyBanId = String(storyBan._id);
          }
        }
        break;
      }

      case ReportActionTaken.GLOBAL_BAN: {
        if (targetUserId) {
          const banResult = await this.userService.banUser({
            userId: targetUserId,
            reviewerId,
            reason: resolution,
          });
          if (banResult && banResult._id) {
            banHistoryId = String(banResult._id);
          }
        }
        break;
      }

      case ReportActionTaken.OFFICIAL_WARNING: {
        this.logInfo('Official warning issued during report resolution', {
          reportId: report._id,
          targetUserId,
          reviewerId,
        });
        break;
      }

      default:
        break;
    }

    return { storyBanId, banHistoryId };
  }

  async resolveStoryReport(
    storySlug: string,
    reportId: string,
    reviewerId: string,
    input: TResolveStoryReportInput
  ): Promise<IReport> {
    const report = await this.reportRepository.findReportById(reportId);
    if (!report) {
      throw AppError.notFound('NOT_FOUND', 'Report not found.');
    }

    if (report.relatedStorySlug && report.relatedStorySlug !== storySlug) {
      throw new AppError('INVALID_INPUT', 400, {
        message: 'Report does not belong to this story.',
      });
    }

    let storyBanId: string | undefined;
    let banHistoryId: string | undefined;

    if (input.actionTaken && input.actionTaken !== ReportActionTaken.NONE) {
      const actionResult = await this.executeReportAction(
        report,
        input.actionTaken as ReportActionTaken,
        reviewerId,
        input.resolution,
        storySlug
      );
      storyBanId = actionResult.storyBanId;
      banHistoryId = actionResult.banHistoryId;
    }

    const updated = await this.reportRepository.resolveReport(reportId, {
      status: input.status,
      resolution: input.resolution,
      actionTaken: input.actionTaken,
      resolvedBy: reviewerId,
      storyBanId,
      banHistoryId,
    });

    if (!updated) {
      throw AppError.notFound('NOT_FOUND', 'Report could not be updated.');
    }

    return updated;
  }

  async resolveAdminReport(
    reportId: string,
    reviewerId: string,
    input: TPlatformResolveReportInput
  ): Promise<IReport> {
    const report = await this.reportRepository.findReportById(reportId);
    if (!report) {
      throw AppError.notFound('NOT_FOUND', 'Report not found.');
    }

    let storyBanId: string | undefined;
    let banHistoryId: string | undefined;

    if (input.globalAction && input.globalAction !== ReportActionTaken.NONE) {
      const actionResult = await this.executeReportAction(
        report,
        input.globalAction as ReportActionTaken,
        reviewerId,
        input.resolution
      );
      storyBanId = actionResult.storyBanId;
      banHistoryId = actionResult.banHistoryId;
    }

    const updated = await this.reportRepository.resolveReport(reportId, {
      status: ReportStatus.RESOLVED,
      resolution: input.resolution,
      actionTaken: input.globalAction,
      resolvedBy: reviewerId,
      storyBanId,
      banHistoryId,
    });

    if (!updated) {
      throw AppError.notFound('NOT_FOUND', 'Report could not be updated.');
    }

    return updated;
  }
}
