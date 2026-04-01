import { singleton } from 'tsyringe';
import { PullRequest } from '@models/pullRequest.model';
import { BaseRepository } from '@utils/baseClass';
import { IPullRequest, IPullRequestDoc } from '@features/pullRequest/types/pullRequest.types';
import { IOperationOptions } from '@/types';
import { ID } from '@/types';

@singleton()
export class PullRequestRepository extends BaseRepository<IPullRequest, IPullRequestDoc> {
  constructor() {
    super(PullRequest);
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  findOpenByChapterAndAuthor(
    chapterSlug: string,
    authorId: string,
    options: IOperationOptions = {}
  ): Promise<IPullRequest | null> {
    return this.findOne({
      filter: {
        chapterSlug,
        authorId,
        status: { $in: ['open', 'approved'] },
      },
      options,
    });
  }

  findOpenByStory(storySlug: string, options: IOperationOptions = {}): Promise<IPullRequest[]> {
    return this.find({
      filter: { storySlug, status: { $in: ['open', 'approved'] } },
      options,
    });
  }

  findOpenById(id: ID, options: IOperationOptions = {}): Promise<IPullRequest | null> {
    return this.findById({ id, options });
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  updateMetadata(
    id: ID,
    fields: { title?: string; description?: string },
    options: IOperationOptions = {}
  ): Promise<IPullRequest | null> {
    return this.findOneAndUpdate({
      filter: { _id: id },
      update: { $set: fields },
      options: { new: true, session: options.session },
    });
  }

  setDraftStatus(
    id: ID,
    isDraft: boolean,
    draftReason: string | undefined,
    options: IOperationOptions = {}
  ): Promise<IPullRequest | null> {
    const setFields: Partial<IPullRequest> & { draftReason?: string; draftedAt?: Date } = {
      isDraft,
    };

    if (isDraft) {
      if (draftReason) setFields.draftReason = draftReason;
      setFields.draftedAt = new Date();
    }

    return this.findOneAndUpdate({
      filter: { _id: id },
      update: { $set: setFields },
      options: { new: true, session: options.session },
    });
  }

  setLabels(
    id: ID,
    labels: string[],
    options: IOperationOptions = {}
  ): Promise<IPullRequest | null> {
    return this.findOneAndUpdate({
      filter: { _id: id },
      update: { $set: { labels } },
      options: { new: true, session: options.session },
    });
  }

  setStatus(
    id: ID,
    status: IPullRequest['status'],
    options: IOperationOptions = {}
  ): Promise<IPullRequest | null> {
    return this.findOneAndUpdate({
      filter: { _id: id },
      update: { $set: { status } },
      options: { new: true, session: options.session },
    });
  }

  patchApprovalsStatus(
    id: ID,
    approvalsStatus: IPullRequest['approvalsStatus'],
    options: IOperationOptions = {}
  ): Promise<IPullRequest | null> {
    return this.findOneAndUpdate({
      filter: { _id: id },
      update: { $set: { approvalsStatus } },
      options: { new: true, session: options.session },
    });
  }

  incrementCommentCount(id: ID, options: IOperationOptions = {}): Promise<IPullRequest | null> {
    return this.findOneAndUpdate({
      filter: { _id: id },
      update: { $inc: { commentCount: 1 } },
      options: { new: true, session: options.session },
    });
  }
}
