import mongoose, { Schema } from 'mongoose';
import { IChapterAutoSaveDoc } from '../features/chapterAutoSave/chapterAutoSave.types';

const chapterAutoSaveSchema = new Schema<IChapterAutoSaveDoc>(
  {
    /**
     * CHAPTER_ID: Which chapter is being auto-saved?
     * USE: Link autosave to chapter
     * REFERENCE: Links to Chapter document
     */
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
    },

    /**
     * USER_ID: Who is editing?
     * USE: Know which user has this draft
     * IMPORTANT: Multiple users shouldn't autosave same chapter at once
     */
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    /**
     * CONTENT: Current unsaved content
     * USE: Store latest changes
     * UPDATE: Every 1 minute (or on save)
     * OVERWRITE: Replace old content with new content
     */
    content: {
      type: String,
      required: true,
      maxlength: 10000000,
    },

    /**
     * TITLE: Current title being edited
     * USE: Store title changes
     * UPDATE: With content changes
     */
    title: {
      type: String,
      maxlength: 200,
    },

    /**
     * LAST_SAVED_AT: When was this last auto-saved?
     * USE: Show "Last saved X minutes ago" in UI
     * UPDATE: Every auto-save interval
     * IMPORTANT: Track for cleanup (delete old autosaves)
     */
    lastSavedAt: {
      type: Date,
      default: Date.now,
    },

    /**
     * IS_ENABLED: Is auto-save turned on?
     * USE: Know if user enabled feature
     * DEFAULT: false (user must enable)
     * UPDATE: When user toggles auto-save
     */
    isEnabled: {
      type: Boolean,
      default: false,
    },

    /**
     * SAVE_COUNT: How many times auto-saved this session?
     * USE: Analytics, know how many saves
     * INCREMENT: Every auto-save
     */
    saveCount: {
      type: Number,
      default: 0,
    },

    /**
     * CHANGES: Track what changed since last version
     * USE: Show "X additions, Y deletions" to user
     */
    changes: {
      additionsCount: Number,
      deletionsCount: Number,
    },

    // track new-chapter mode
    // draftId: String,

    /**
     * AUTO_SAVE_TYPE: What type of save operation is this?
     * USE: Track if this is an update, new chapter, or root chapter
     * OPTIONS: 'update_chapter' | 'new_chapter' | 'root_chapter'
     */
    autoSaveType: {
      type: String,
      enum: ['update_chapter', 'new_chapter', 'root_chapter'],
      required: true,
    },

    /**
     * STORY_ID: Which story does this belong to?
     * USE: Link autosave to story for all save types
     * REFERENCE: Links to Story document
     */
    storyId: {
      type: Schema.Types.ObjectId,
      ref: 'Story',
      required: true,
      index: true,
    },

    /**
     * PARENT_CHAPTER_ID: Which is the parent chapter?
     * USE: For new_chapter and update types - track parent relationship
     * REFERENCE: Links to Chapter document
     */
    parentChapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

chapterAutoSaveSchema.index({ lastSavedAt: 1 });

const ChapterAutoSave = mongoose.model<IChapterAutoSaveDoc>(
  'ChapterAutoSave',
  chapterAutoSaveSchema
);

export { ChapterAutoSave };
