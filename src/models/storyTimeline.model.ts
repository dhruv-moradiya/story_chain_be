import mongoose, { Schema } from 'mongoose';
import { IStoryTimelineDoc } from '@features/story/types/story.types';
import { STORY_TIMELINE_ACTIONS } from '@features/story/types/story-enum';

const storyTimelineSchema = new Schema<IStoryTimelineDoc>(
  {
    /**
     * STORY_SLUG: Which story does this event belong to?
     * Denormalized here so we can build a story-level activity feed
     * without joining to any other collection.
     */
    storySlug: {
      type: String,
      required: true,
      index: true,
    },

    /**
     * ACTION: What happened?
     * Maps to the StoryTimelineAction enum values.
     */
    action: {
      type: String,
      enum: STORY_TIMELINE_ACTIONS,
      required: true,
      index: true,
    },

    /**
     * PERFORMED_BY: Who triggered the event?
     * Clerk userId string. `null` for system-generated events.
     */
    performedBy: {
      type: String,
      ref: 'User',
      default: null,
      index: true,
    },

    /**
     * PERFORMED_AT: When did it happen?
     * Authoritative event timestamp — do NOT use `createdAt` for sorting.
     */
    performedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    /**
     * METADATA: Action-specific context.
     * Flexible Mixed type so each action type can carry its own payload.
     * Examples:
     *   chapter_added         → { chapterSlug, chapterTitle }
     *   pr_merged             → { prId, chapterSlug }
     *   collaborator_added    → { targetUserId, role }
     *   settings_updated      → { changedFields: string[] }
     */
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // We use `performedAt` as the authoritative time — no need for mongoose timestamps.
    timestamps: false,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

// Primary feed: all events for a story, newest first
storyTimelineSchema.index({ storySlug: 1, performedAt: -1 });

// Filter by action type within a story
storyTimelineSchema.index({ storySlug: 1, action: 1, performedAt: -1 });

// User activity feed: everything a specific user did
storyTimelineSchema.index({ performedBy: 1, performedAt: -1 });

// ─────────────────────────────────────────────────────────────────────────────

const StoryTimeline = mongoose.model<IStoryTimelineDoc>('StoryTimeline', storyTimelineSchema);

export { StoryTimeline };
