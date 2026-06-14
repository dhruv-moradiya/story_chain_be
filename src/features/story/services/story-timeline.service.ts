import { inject, singleton } from 'tsyringe';

import { BaseModule } from '@/utils/baseClass';
import { TOKENS } from '@/container';
import { IOperationOptions } from '@/types';
import { StoryTimelineAction } from '@features/story/types/story-enum';
import { IStoryTimeline, TStoryTimelineAction } from '@features/story/types/story.types';
import {
  StoryTimelineRepository,
  IGetStoryTimelineOptions,
} from '@features/story/repositories/storyTimeline.repository';
import { IGetTimelineDTO, IRecordTimelineEventDTO } from '@/dto/story.dto';

@singleton()
class StoryTimelineService extends BaseModule {
  constructor(
    @inject(TOKENS.StoryTimelineRepository)
    private readonly storyTimelineRepo: StoryTimelineRepository
  ) {
    super();
  }

  /**
   * Generic: record any event on the story timeline.
   */
  async record(
    input: IRecordTimelineEventDTO,
    options: IOperationOptions = {}
  ): Promise<IStoryTimeline> {
    const event = await this.storyTimelineRepo.appendEvent(input, options);

    this.logInfo(
      `Timeline event recorded: [${input.action}] on story "${input.storySlug}" by "${input.performedBy ?? 'system'}"`,
      { action: input.action, storySlug: input.storySlug }
    );

    return event;
  }

  // ----------------------
  // Story LifeCycle
  // ----------------------
  recordStoryCreated(storySlug: string, creatorId: string, options?: IOperationOptions) {
    return this.record(
      { storySlug, action: StoryTimelineAction.STORY_CREATED, performedBy: creatorId },
      options
    );
  }

  recordStoryPublished(storySlug: string, performedBy: string, options?: IOperationOptions) {
    return this.record(
      { storySlug, action: StoryTimelineAction.STORY_PUBLISHED, performedBy },
      options
    );
  }

  recordStoryArchived(storySlug: string, performedBy: string, options?: IOperationOptions) {
    return this.record(
      { storySlug, action: StoryTimelineAction.STORY_ARCHIVED, performedBy },
      options
    );
  }

  recordStoryDeleted(storySlug: string, performedBy: string, options?: IOperationOptions) {
    return this.record(
      { storySlug, action: StoryTimelineAction.STORY_DELETED, performedBy },
      options
    );
  }

  // ----------------------
  // Chapter LifeCycle
  // ----------------------
  recordChapterAdded(
    storySlug: string,
    performedBy: string,
    metadata: { chapterSlug: string; chapterTitle?: string },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.CHAPTER_ADDED, performedBy, metadata },
      options
    );
  }

  recordChapterUpdated(
    storySlug: string,
    performedBy: string,
    metadata: { chapterSlug: string; chapterTitle?: string },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.CHAPTER_UPDATED, performedBy, metadata },
      options
    );
  }

  recordChapterDeleted(
    storySlug: string,
    performedBy: string,
    metadata: { chapterSlug: string },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.CHAPTER_DELETED, performedBy, metadata },
      options
    );
  }

  recordChapterMarkedEnding(
    storySlug: string,
    performedBy: string,
    metadata: { chapterSlug: string },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.CHAPTER_MARKED_ENDING, performedBy, metadata },
      options
    );
  }

  // ----------------------
  // Pull Request LifeCycle
  // ----------------------
  recordPRSubmitted(
    storySlug: string,
    performedBy: string,
    metadata: { prId: string; chapterSlug?: string },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.PR_SUBMITTED, performedBy, metadata },
      options
    );
  }

  recordPRApproved(
    storySlug: string,
    performedBy: string,
    metadata: { prId: string },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.PR_APPROVED, performedBy, metadata },
      options
    );
  }

  recordPRMerged(
    storySlug: string,
    performedBy: string,
    metadata: { prId: string; chapterSlug?: string },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.PR_MERGED, performedBy, metadata },
      options
    );
  }

  recordPRRejected(
    storySlug: string,
    performedBy: string,
    metadata: { prId: string; reason?: string },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.PR_REJECTED, performedBy, metadata },
      options
    );
  }

  recordPRClosed(
    storySlug: string,
    performedBy: string,
    metadata: { prId: string },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.PR_CLOSED, performedBy, metadata },
      options
    );
  }

  // ----------------------
  // Collaborator LifeCycle
  // ----------------------
  recordCollaboratorAdded(
    storySlug: string,
    performedBy: string,
    metadata: { targetUserId: string; role: string },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.COLLABORATOR_ADDED, performedBy, metadata },
      options
    );
  }

  recordCollaboratorRemoved(
    storySlug: string,
    performedBy: string,
    metadata: { targetUserId: string },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.COLLABORATOR_REMOVED, performedBy, metadata },
      options
    );
  }

  recordCollaboratorRoleChanged(
    storySlug: string,
    performedBy: string,
    metadata: { targetUserId: string; oldRole: string; newRole: string },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.COLLABORATOR_ROLE_CHANGED, performedBy, metadata },
      options
    );
  }

  recordCollaboratorInvited(
    storySlug: string,
    performedBy: string,
    metadata: { targetUserId: string; role: string },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.COLLABORATOR_INVITED, performedBy, metadata },
      options
    );
  }

  recordCollaboratorInvitationAccepted(
    storySlug: string,
    performedBy: string,
    metadata: { role: string },
    options?: IOperationOptions
  ) {
    return this.record(
      {
        storySlug,
        action: StoryTimelineAction.COLLABORATOR_INVITATION_ACCEPTED,
        performedBy,
        metadata,
      },
      options
    );
  }

  recordCollaboratorInvitationRejected(
    storySlug: string,
    performedBy: string,
    options?: IOperationOptions
  ) {
    return this.record(
      {
        storySlug,
        action: StoryTimelineAction.COLLABORATOR_INVITATION_REJECTED,
        performedBy,
      },
      options
    );
  }

  // ----------------------
  // Settings LifeCycle
  // ----------------------
  recordSettingsUpdated(
    storySlug: string,
    performedBy: string,
    metadata: { changedFields: string[] },
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.SETTINGS_UPDATED, performedBy, metadata },
      options
    );
  }

  recordCoverImageUpdated(storySlug: string, performedBy: string, options?: IOperationOptions) {
    return this.record(
      { storySlug, action: StoryTimelineAction.COVER_IMAGE_UPDATED, performedBy },
      options
    );
  }

  recordCardImageUpdated(storySlug: string, performedBy: string, options?: IOperationOptions) {
    return this.record(
      { storySlug, action: StoryTimelineAction.CARD_IMAGE_UPDATED, performedBy },
      options
    );
  }

  // ----------------------
  // Moderation LifeCycle
  // ----------------------
  recordStoryFlagged(
    storySlug: string,
    performedBy: string | null,
    metadata?: Record<string, unknown>,
    options?: IOperationOptions
  ) {
    return this.record(
      { storySlug, action: StoryTimelineAction.STORY_FLAGGED, performedBy, metadata },
      options
    );
  }

  recordStoryUnflagged(storySlug: string, performedBy: string, options?: IOperationOptions) {
    return this.record(
      { storySlug, action: StoryTimelineAction.STORY_UNFLAGGED, performedBy },
      options
    );
  }

  // ----------------------
  // Queries
  // ----------------------

  /**
   * Fetch the full activity timeline for a story, newest first.
   */
  async getTimeline(
    input: IGetTimelineDTO,
    options?: IGetStoryTimelineOptions
  ): Promise<{ events: IStoryTimeline[]; total: number }> {
    const { storySlug, limit, skip } = input;

    const [events, total] = await Promise.all([
      this.storyTimelineRepo.findByStory(storySlug, { ...options, limit, skip }),
      this.storyTimelineRepo.countByStory(storySlug, options),
    ]);

    const formattedEvents = events.map((eventDoc) =>
      this.formatTimelineEvent(eventDoc)
    ) as unknown as IStoryTimeline[];

    return { events: formattedEvents, total };
  }

  /**
   * Fetch timeline events filtered by a specific action type.
   */
  async getTimelineByAction(
    storySlug: string,
    action: TStoryTimelineAction,
    options?: IGetStoryTimelineOptions
  ): Promise<IStoryTimeline[]> {
    const events = await this.storyTimelineRepo.findByStoryAndAction(storySlug, action, options);

    return events.map((eventDoc) =>
      this.formatTimelineEvent(eventDoc)
    ) as unknown as IStoryTimeline[];
  }

  private formatTimelineEvent(eventDoc: unknown): Record<string, unknown> {
    const doc = eventDoc as Record<string, unknown>;
    const event = (
      doc && typeof doc === 'object' && 'toJSON' in doc && typeof doc.toJSON === 'function'
        ? doc.toJSON()
        : doc
    ) as Record<string, unknown>;

    // 1. performedBy
    if (event.user) {
      event.performedBy = event.user;
    }
    delete event.user;

    // 2. storySlug -> story
    if (event.story) {
      delete event.storySlug;
    } else if (event.storySlug) {
      event.story = { slug: event.storySlug };
      delete event.storySlug;
    }

    // 3. metadata chapter and targetUser
    if (event.metadata && typeof event.metadata === 'object') {
      const metadata = event.metadata as Record<string, unknown>;
      if (event.chapter) {
        metadata.chapter = event.chapter;
        delete metadata.chapterSlug;
      } else if (metadata.chapterSlug) {
        metadata.chapter = { slug: metadata.chapterSlug };
        delete metadata.chapterSlug;
      }

      if (event.targetUser) {
        metadata.targetUser = event.targetUser;
        delete metadata.targetUserId;
      } else if (metadata.targetUserId) {
        metadata.targetUser = { clerkId: metadata.targetUserId };
        delete metadata.targetUserId;
      }
    }
    delete event.chapter;
    delete event.targetUser;

    return event;
  }
}

export { StoryTimelineService };
