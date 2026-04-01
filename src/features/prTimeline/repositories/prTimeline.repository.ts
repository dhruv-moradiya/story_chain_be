import { singleton } from 'tsyringe';
import { PRTimeline } from '@models/prTimeline.model';
import { BaseRepository } from '@utils/baseClass';
import { IPRTimeline, IPRTimelineDoc } from '@features/prTimeline/types/prTimeline.types';
import { TPRTimelineAction } from '@features/pullRequest/types/pullRequest.types';
import { IOperationOptions } from '@/types';
import { ID } from '@/types';
import { Types } from 'mongoose';

export interface ICreateTimelineEventInput {
  pullRequestId: ID;
  storySlug: string;
  action: TPRTimelineAction;
  performedBy: string | null;
  metadata?: Record<string, unknown>;
}

@singleton()
export class PRTimelineRepository extends BaseRepository<IPRTimeline, IPRTimelineDoc> {
  constructor() {
    super(PRTimeline);
  }

  appendEvent(
    input: ICreateTimelineEventInput,
    options: IOperationOptions = {}
  ): Promise<IPRTimeline> {
    const { pullRequestId, storySlug, action, performedBy, metadata = {} } = input;

    return this.create({
      data: {
        pullRequestId: new Types.ObjectId(pullRequestId.toString()) as unknown as ID,
        storySlug,
        action,
        performedBy,
        performedAt: new Date(),
        metadata,
      },
      options,
    });
  }

  findByPR(pullRequestId: ID, options: IOperationOptions = {}): Promise<IPRTimeline[]> {
    return this.find({
      filter: { pullRequestId },
      options,
    });
  }
}
