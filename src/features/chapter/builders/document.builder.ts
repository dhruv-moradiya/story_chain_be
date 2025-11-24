import { ChapterRepository } from '../repositories/chapter.repository';
import { ChapterBuildContext } from '../chapter.types';
import { IChapter } from '../chapter.types';
import { Types } from 'mongoose';
import { BaseModule } from '../../../utils/baseClass';

export class ChapterDocumentBuilder extends BaseModule {
  private chapterRepo: ChapterRepository;

  constructor(chapterRepo: ChapterRepository) {
    super();
    this.chapterRepo = chapterRepo;
  }

  async build(data: ChapterBuildContext): Promise<IChapter> {
    return await this.chapterRepo.create({
      storyId: new Types.ObjectId(data.storyId),
      parentChapterId: data.parentChapterId ? new Types.ObjectId(data.parentChapterId) : null,
      ancestorIds: data.ancestorIds,
      depth: data.depth,
      authorId: data.userId,
      content: data.content,
      title: data.title,
      status: data.chapterStatus,

      pullRequest: {
        isPR: data.isPR,
        status: data.isPR ? 'PENDING' : 'APPROVED',
        ...(data.isPR ? { submittedAt: new Date() } : {}),
      },
      votes: { upvotes: 0, downvotes: 0, score: 0 },
      isEnding: false,
      version: 1,
      stats: {
        reads: 0,
        comments: 0,
        childBranches: 0,
      },
      reportCount: 0,
      isFlagged: false,
    });
  }
}
