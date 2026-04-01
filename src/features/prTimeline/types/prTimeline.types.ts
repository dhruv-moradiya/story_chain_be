import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import { TPRTimelineAction } from '@features/pullRequest/types/pullRequest.types';

export interface IPRTimeline {
  _id: ID;
  pullRequestId: ID;
  storySlug: string; // denormalized for story-level feeds
  action: TPRTimelineAction; // what happened
  performedBy: string | null; // clerkId — null for system events
  performedAt: Date; // authoritative event time
  metadata: Record<string, unknown>; // action-specific context
}

export interface IPRTimelineDoc extends Document, IPRTimeline {
  _id: Types.ObjectId;
}
