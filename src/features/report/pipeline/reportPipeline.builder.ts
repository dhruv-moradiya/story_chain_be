import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';
import {
  attachUserStages,
  PUBLIC_USER_PROJECTION,
  USER_WITH_EMAIL_PROJECTION,
} from '@/shared/pipelines';
import { ID } from '@/types';
import { toId } from '@/utils';
import { Types } from 'mongoose';
import { IReport, TReportType, TReportReason, TReportStatus } from '../types/report.types';
import { ReportGovernanceLevel, ReportType } from '../types/report-enum';

/**
 * MongoDB Aggregation Pipeline Builder for Report queries.
 * Supports various filtering cases, lookup attachments (reporter, targetUser, story, chapter, comment),
 * status/reason analytics, and use-case presets.
 */
export class ReportPipelineBuilder extends BasePipelineBuilder<ReportPipelineBuilder> {
  // ═══════════════════════════════════════════
  // MATCHERS / FILTERS
  // ═══════════════════════════════════════════

  /**
   * Matches a report by its unique ID.
   */
  findById(reportId: ID) {
    if (typeof reportId === 'string' && !Types.ObjectId.isValid(reportId)) {
      this.pipeline.push({ $match: { _id: null } });
      return this;
    }
    this.pipeline.push({
      $match: {
        _id: toId(reportId),
      },
    });
    return this;
  }

  /**
   * Matches reports filed by a specific reporter.
   */
  byReporter(reporterId: string) {
    this.pipeline.push({
      $match: {
        reporterId,
      },
    });
    return this;
  }

  /**
   * Matches reports by report type (CHAPTER, COMMENT, USER, STORY).
   * Accepts a single type or an array of types.
   */
  byReportType(reportType: TReportType | TReportType[]) {
    if (Array.isArray(reportType)) {
      this.pipeline.push({
        $match: {
          reportType: { $in: reportType },
        },
      });
    } else {
      this.pipeline.push({
        $match: {
          reportType,
        },
      });
    }
    return this;
  }

  /**
   * Matches reports by governance level (STORY or PLATFORM).
   */
  byGovernanceLevel(governanceLevel: ReportGovernanceLevel) {
    this.pipeline.push({
      $match: {
        governanceLevel,
      },
    });
    return this;
  }

  /**
   * Matches reports by status (PENDING, UNDER_REVIEW, RESOLVED, DISMISSED, ESCALATED).
   * Accepts a single status or an array of statuses.
   */
  byStatus(status: TReportStatus | TReportStatus[]) {
    if (Array.isArray(status)) {
      this.pipeline.push({
        $match: {
          status: { $in: status },
        },
      });
    } else {
      this.pipeline.push({
        $match: {
          status,
        },
      });
    }
    return this;
  }

  /**
   * Matches reports by report reason.
   * Accepts a single reason or an array of reasons.
   */
  byReason(reason: TReportReason | TReportReason[]) {
    if (Array.isArray(reason)) {
      this.pipeline.push({
        $match: {
          reason: { $in: reason },
        },
      });
    } else {
      this.pipeline.push({
        $match: {
          reason,
        },
      });
    }
    return this;
  }

  /**
   * Matches reports associated with a specific story slug.
   */
  byStory(storySlug: string) {
    this.pipeline.push({
      $match: {
        relatedStorySlug: storySlug,
      },
    });
    return this;
  }

  /**
   * Matches reports associated with a specific chapter slug.
   */
  byChapter(chapterSlug: string) {
    this.pipeline.push({
      $match: {
        relatedChapterSlug: chapterSlug,
      },
    });
    return this;
  }

  /**
   * Matches reports associated with a specific comment ID.
   */
  byComment(commentId: ID) {
    this.pipeline.push({
      $match: {
        relatedCommentId: toId(commentId),
      },
    });
    return this;
  }

  /**
   * Matches reports targeting a specific user ID (`relatedUserId`).
   */
  byTargetUser(userId: string) {
    this.pipeline.push({
      $match: {
        relatedUserId: userId,
      },
    });
    return this;
  }

  /**
   * Matches reports opened by a specific moderator/admin (`openedBy`).
   */
  byOpenedBy(userId: string) {
    this.pipeline.push({
      $match: {
        openedBy: userId,
      },
    });
    return this;
  }

  /**
   * Matches reports resolved by a specific moderator/admin (`resolvedBy`).
   */
  byResolvedBy(userId: string) {
    this.pipeline.push({
      $match: {
        resolvedBy: userId,
      },
    });
    return this;
  }

  /**
   * Filters reports created within a given date range.
   */
  byDateRange(startDate?: Date, endDate?: Date) {
    const matchExpr: Record<string, unknown> = {};
    if (startDate) matchExpr.$gte = startDate;
    if (endDate) matchExpr.$lte = endDate;

    if (Object.keys(matchExpr).length > 0) {
      this.pipeline.push({
        $match: {
          createdAt: matchExpr,
        },
      });
    }
    return this;
  }

  /**
   * Searches report description for text pattern (case-insensitive).
   */
  searchDescription(searchTerm: string) {
    if (searchTerm.trim()) {
      this.pipeline.push({
        $match: {
          description: { $regex: searchTerm.trim(), $options: 'i' },
        },
      });
    }
    return this;
  }

  // ═══════════════════════════════════════════
  // ATTACHMENTS / LOOKUPS
  // ═══════════════════════════════════════════

  /**
   * Attaches reporter details (`reporterId` -> `reporter`).
   */
  attachReporter(project: Record<string, unknown> = PUBLIC_USER_PROJECTION) {
    this.pipeline.push(
      ...attachUserStages({
        localField: 'reporterId',
        as: 'reporter',
        project,
      })
    );
    return this;
  }

  /**
   * Attaches reported target user details (`relatedUserId` -> `targetUser`).
   */
  attachTargetUser(project: Record<string, unknown> = PUBLIC_USER_PROJECTION) {
    this.pipeline.push(
      ...attachUserStages({
        localField: 'relatedUserId',
        as: 'targetUser',
        project,
      })
    );
    return this;
  }

  /**
   * Attaches user who opened/reviewed the report (`openedBy` -> `openedByUser`).
   */
  attachOpenedByUser(project: Record<string, unknown> = PUBLIC_USER_PROJECTION) {
    this.pipeline.push(
      ...attachUserStages({
        localField: 'openedBy',
        as: 'openedByUser',
        project,
      })
    );
    return this;
  }

  /**
   * Attaches user who resolved/dismissed the report (`resolvedBy` -> `resolvedByUser`).
   */
  attachResolvedByUser(project: Record<string, unknown> = PUBLIC_USER_PROJECTION) {
    this.pipeline.push(
      ...attachUserStages({
        localField: 'resolvedBy',
        as: 'resolvedByUser',
        project,
      })
    );
    return this;
  }

  /**
   * Attaches user/admin to whom the report was escalated (`escalatedTo` -> `escalatedToUser`).
   */
  attachEscalatedToUser(project: Record<string, unknown> = PUBLIC_USER_PROJECTION) {
    this.pipeline.push(
      ...attachUserStages({
        localField: 'escalatedTo',
        as: 'escalatedToUser',
        project,
      })
    );
    return this;
  }

  /**
   * Attaches related story details (`relatedStorySlug` -> `story`).
   */
  attachStory() {
    this.pipeline.push(
      {
        $lookup: {
          from: 'stories',
          let: { storySlug: '$relatedStorySlug' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$slug', '$$storySlug'] },
              },
            },
            {
              $project: {
                _id: 0,
                title: 1,
                slug: 1,
                creatorId: 1,
                coverImage: 1,
                status: 1,
              },
            },
          ],
          as: 'story',
        },
      },
      {
        $unwind: {
          path: '$story',
          preserveNullAndEmptyArrays: true,
        },
      }
    );
    return this;
  }

  /**
   * Attaches related chapter details (`relatedChapterSlug` -> `chapter`).
   */
  attachChapter() {
    this.pipeline.push(
      {
        $lookup: {
          from: 'chapters',
          let: { chapterSlug: '$relatedChapterSlug' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$slug', '$$chapterSlug'] },
              },
            },
            {
              $project: {
                _id: 0,
                title: 1,
                slug: 1,
                storySlug: 1,
                chapterNumber: 1,
                authorId: 1,
                status: 1,
              },
            },
          ],
          as: 'chapter',
        },
      },
      {
        $unwind: {
          path: '$chapter',
          preserveNullAndEmptyArrays: true,
        },
      }
    );
    return this;
  }

  /**
   * Attaches related comment details (`relatedCommentId` -> `comment`), including comment author.
   */
  attachComment() {
    this.pipeline.push(
      {
        $lookup: {
          from: 'comments',
          let: { commentId: '$relatedCommentId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$commentId'] },
              },
            },
            ...attachUserStages({
              localField: 'userId',
              as: 'author',
              project: PUBLIC_USER_PROJECTION,
            }),
            {
              $project: {
                _id: 1,
                content: 1,
                chapterSlug: 1,
                isDeleted: 1,
                createdAt: 1,
                author: 1,
              },
            },
          ],
          as: 'comment',
        },
      },
      {
        $unwind: {
          path: '$comment',
          preserveNullAndEmptyArrays: true,
        },
      }
    );
    return this;
  }

  /**
   * Attaches all relevant entity lookups (`reporter`, `targetUser`, `story`, `chapter`, `comment`).
   */
  attachAllEntities(includeEmail = false) {
    const userProj = includeEmail ? USER_WITH_EMAIL_PROJECTION : PUBLIC_USER_PROJECTION;

    return this.attachReporter(userProj)
      .attachTargetUser(userProj)
      .attachStory()
      .attachChapter()
      .attachComment()
      .attachOpenedByUser(PUBLIC_USER_PROJECTION)
      .attachResolvedByUser(PUBLIC_USER_PROJECTION);
  }

  /**
   * Formats a polymorphic `targetEntity` field based on `reportType`.
   */
  attachPolymorphicTarget() {
    this.pipeline.push({
      $addFields: {
        targetEntity: {
          $switch: {
            branches: [
              { case: { $eq: ['$reportType', ReportType.USER] }, then: '$targetUser' },
              { case: { $eq: ['$reportType', ReportType.STORY] }, then: '$story' },
              { case: { $eq: ['$reportType', ReportType.CHAPTER] }, then: '$chapter' },
              { case: { $eq: ['$reportType', ReportType.COMMENT] }, then: '$comment' },
            ],
            default: null,
          },
        },
      },
    });
    return this;
  }

  /**
   * Attaches resulting ban details if storyBanId or banHistoryId exists.
   */
  attachBanDetails() {
    this.pipeline.push(
      {
        $lookup: {
          from: 'storybans',
          localField: 'storyBanId',
          foreignField: '_id',
          as: 'storyBan',
        },
      },
      {
        $unwind: {
          path: '$storyBan',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'banhistories',
          localField: 'banHistoryId',
          foreignField: '_id',
          as: 'banHistory',
        },
      },
      {
        $unwind: {
          path: '$banHistory',
          preserveNullAndEmptyArrays: true,
        },
      }
    );
    return this;
  }

  /**
   * Cleans up redundant raw reference fields once they have been populated into objects.
   * Removes reporterId, relatedUserId, relatedStorySlug, relatedChapterSlug, relatedCommentId,
   * openedBy, resolvedBy, escalatedTo, storyBanId, banHistoryId.
   */
  cleanPopulatedFields() {
    this.pipeline.push({
      $unset: [
        'reporterId',
        'relatedUserId',
        'relatedStorySlug',
        'relatedChapterSlug',
        'relatedCommentId',
        'openedBy',
        'resolvedBy',
        'escalatedTo',
        'storyBanId',
        'banHistoryId',
      ],
    });
    return this;
  }

  /**
   * Removes internal or unnecessary raw IDs after lookups.
   */
  removeFields(fields: (keyof IReport | string)[]) {
    this.pipeline.push({
      $unset: fields,
    });
    return this;
  }

  // ═══════════════════════════════════════════
  // ANALYTICS / STATS CASES
  // ═══════════════════════════════════════════

  /**
   * Groups report counts by status.
   */
  groupStatsByStatus() {
    this.pipeline.push({
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    });
    return this;
  }

  /**
   * Groups report counts by reason.
   */
  groupStatsByReason() {
    this.pipeline.push({
      $group: {
        _id: '$reason',
        count: { $sum: 1 },
      },
    });
    return this;
  }

  /**
   * Groups report counts by reportType.
   */
  groupStatsByType() {
    this.pipeline.push({
      $group: {
        _id: '$reportType',
        count: { $sum: 1 },
      },
    });
    return this;
  }

  /**
   * Groups report counts by governanceLevel.
   */
  groupStatsByGovernanceLevel() {
    this.pipeline.push({
      $group: {
        _id: '$governanceLevel',
        count: { $sum: 1 },
      },
    });
    return this;
  }

  // ═══════════════════════════════════════════
  // PRESETS FOR DIFFERENT USE CASES
  // ═══════════════════════════════════════════

  /**
   * Preset for fetching reports submitted by a specific user (`getMyReports`).
   */
  getUserReportsPreset(
    reporterId: string,
    options: { page?: number; limit?: number; status?: TReportStatus } = {}
  ) {
    const { page = 1, limit = 10, status } = options;

    return this.byReporter(reporterId)
      .when(!!status, (b) => b.byStatus(status!))
      .attachTargetUser()
      .attachStory()
      .attachChapter()
      .attachComment()
      .attachPolymorphicTarget()
      .cleanPopulatedFields()
      .sortByCreatedAt(-1)
      .paginate(page, limit);
  }

  /**
   * Preset for fetching story moderation reports (`getStoryReports`).
   * Fetches CHAPTER and COMMENT reports belonging to the story.
   */
  getStoryReportsPreset(
    storySlug: string,
    options: { page?: number; limit?: number; status?: TReportStatus } = {}
  ) {
    const { page = 1, limit = 10, status } = options;

    return this.byStory(storySlug)
      .byGovernanceLevel(ReportGovernanceLevel.STORY)
      .when(!!status, (b) => b.byStatus(status!))
      .attachReporter()
      .attachChapter()
      .attachComment()
      .attachPolymorphicTarget()
      .cleanPopulatedFields()
      .sortByCreatedAt(-1)
      .paginate(page, limit);
  }

  /**
   * Preset for platform admin moderation dashboard (`getAdminReports`).
   * Supports filtering by status, reportType, reason, and governanceLevel.
   */
  getAdminReportsPreset(
    options: {
      page?: number;
      limit?: number;
      status?: TReportStatus;
      reportType?: TReportType;
      reason?: TReportReason;
      governanceLevel?: ReportGovernanceLevel;
    } = {}
  ) {
    const { page = 1, limit = 10, status, reportType, reason, governanceLevel } = options;

    return this.when(!!status, (b) => b.byStatus(status!))
      .when(!!reportType, (b) => b.byReportType(reportType!))
      .when(!!reason, (b) => b.byReason(reason!))
      .when(!!governanceLevel, (b) => b.byGovernanceLevel(governanceLevel!))
      .attachReporter(USER_WITH_EMAIL_PROJECTION)
      .attachTargetUser(USER_WITH_EMAIL_PROJECTION)
      .attachStory()
      .attachChapter()
      .attachComment()
      .attachOpenedByUser()
      .attachResolvedByUser()
      .attachEscalatedToUser()
      .attachPolymorphicTarget()
      .cleanPopulatedFields()
      .sortByCreatedAt(-1)
      .paginate(page, limit);
  }

  /**
   * Preset for fetching user's own report details (`getUserReportById`).
   * Filters by reportId AND reporterId before populating linked entities and cleaning raw fields.
   */
  getUserReportDetailsPreset(reportId: ID, reporterId: string) {
    return this.findById(reportId)
      .byReporter(reporterId)
      .attachAllEntities(false)
      .attachEscalatedToUser()
      .attachBanDetails()
      .attachPolymorphicTarget()
      .cleanPopulatedFields();
  }

  /**
   * Preset for single report detailed view (`getReportById`).
   * Populates all linked entities and unsets raw reference fields.
   */
  getReportDetailsPreset(reportId: ID) {
    return this.findById(reportId)
      .attachAllEntities(true)
      .attachEscalatedToUser()
      .attachBanDetails()
      .attachPolymorphicTarget()
      .cleanPopulatedFields();
  }
}
