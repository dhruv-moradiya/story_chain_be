---
name: Project Overview & Architecture
description: Comprehensive details about the models, folder structure, and the kind of project this is.
---

# StoryChain Backend - Project Context

This skill provides an overview of the StoryChain Backend's architecture, technologies, folder structure, and the entire suite of database models it utilizes.

## Project Type & Architecture
This is a **Node.js/TypeScript Backend** built using the **Fastify** web framework. The project is an interactive, collaborative story-writing platform where stories can branch out into multiple chapters, resembling a community-driven "choose-your-own-adventure" ecosystem. It features pull requests (PRs) for chapter contributions, voting, and reading history tracking.

**Key Technical Stack & Architecture Details:**
- **Web Framework**: Fastify
- **Database**: MongoDB (via Mongoose)
- **Dependency Injection**: `tsyringe` (Service/Repository pattern)
- **Caching & Background Jobs**: Redis & BullMQ
- **Authentication**: Clerk (`@clerk/fastify`)
- **Validation**: Zod (for DTOs/Schemas)
- **Architecture**: Modular / Feature-Sliced Design (FSD). The project divides logic into domains (`features/`), with dedicated `controllers`, `services`, `repositories`, and `routes` for each feature.

---

## Folder Structure

The application is structured inside the `src/` directory with a clear separation of concerns:

```text
src/
├── config/           # Application configurations (DB, Redis, Env vars)
├── constants/        # Global enums, hardcoded static values
├── container/        # DI Setup (`registry.ts`, `tokens.ts`) using tsyringe
├── domain/           # Core domain models/interfaces (if applying DDD)
├── dto/              # Data Transfer Objects / Request validation schemas
├── features/         # Feature Modules (The core isolated domain logic)
│   ├── bookmark/     # Bookmark feature
│   ├── chapter/      # Chapter logic, branches, content
│   ├── comment/      # Chapter/Story comments
│   ├── pullRequest/  # PR logic for merging community chapters
│   ├── readingHistory/ # Tracking user session read-times/progress
│   ├── story/        # Story overview, stats, meta
│   ├── user/         # User profile sync with Clerk
│   └── [others...]   # see models below for exhaustive feature list
├── infrastructure/   # External services integrations (Email, Cloudinary)
├── jobs/             # BullMQ worker processors & job definitions
├── middlewares/      # Fastify request middlewares (Auth, Rate Limiting)
├── models/           # Mongoose schemas/models definitions (The DB Layer)
├── routes/           # Global route bootstrapping
├── schema/           # Fastify/Zod schema files for API response definitions
├── shared/           # Reusable generic components/services
├── transformer/      # Data conversion logic (e.g., Clerk Webhooks)
├── types/            # TypeScript ambient/global type definitions
└── utils/            # Helper functions (e.g., Error handlers, Response wrappers)
```

---

## Database Models

The `src/models/` directory contains all Mongoose representations of the application's domain logic. Here is each and every model along with its primary purpose:

### Core Content
1. **`story.model.ts`**: The root entity of a story. Contains the metadata, overall stats, and links to the initial or "root" chapter.
2. **`chapter.model.ts`**: Represents a single node in a story. Chapters can branch off one another (parent-child relationship).
3. **`chapterVersion.model.ts`**: Tracks historical revisions and edit history of an existing chapter.
4. **`chapterAutoSave.modal.ts`**: Stores active draft states while users are currently writing/editing before publishing or submitting.

### Contribution & Collaboration (The PR System)
5. **`pullRequest.model.ts`**: Manages community submissions. When a user wants to append a chapter to an existing story, it creates a PR that must be reviewed.
6. **`prComment.model.ts`**: Discussion threads specific to a Pull Request.
7. **`prReview.model.ts`**: Formal review feedback left on a Pull Request.
8. **`prVote.model.ts`**: Tracks votes (approvals/rejections) on a Pull Request.
9. **`storyCollaborator.model.ts`**: Manages explicit permissions and roles for users collaborating directly on a specific story.

### Social & Interaction
10. **`vote.model.ts`**: General upvotes and downvotes on published stories/chapters.
11. **`comment.model.ts`**: Public reader comments on stories or chapters.
12. **`commentVote.model.ts`**: Upvotes/downvotes specifically for comments.
13. **`bookmark.model.ts`**: Allows users to save stories or specific chapters to read later.
14. **`follow.model.ts`**: Social graph model. Tracks users following other authors/users.

### Tracking & Analytics
15. **`readingHistory.model.ts`**: Crucial heartbeat model tracking a user's exact reading progress, active session timestamps, total read time on a branch, and whether their read is "qualifying" (long enough to count as a real read).
16. **`session.model.ts`**: Tracking of active user logins / client sessions.

### Platform Administration
17. **`user.model.ts`**: The application's mirror of the Clerk Auth user. Stores user profiles, display names, and avatars.
18. **`platformRole.model.ts`**: Role-Based Access Control (RBAC) definitions mapping users to global roles (Admin, Mod, etc.).
19. **`report.model.ts`**: User-submitted reports for inappropriate content or community guideline violations.
20. **`appeal.modal.ts`**: System allowing users to appeal reports, bans, or rejected content actions.
21. **`notification.model.ts`**: General application notifications for users (e.g., "Your PR was accepted").


## Complete Model Source Codes

Below is the literal source code for each and every Mongoose model in the project for strict context/schema reference.

### `src/models/appeal.modal.ts`

```typescript
import mongoose, { Schema } from 'mongoose';

const appealSchema = new Schema(
  {
    banHistoryId: {
      type: Schema.Types.ObjectId,
      ref: 'BanHistory',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Appeal content
    appealReason: {
      type: String,
      required: true,
      maxlength: 200,
    },
    explanation: {
      type: String,
      required: true,
      minlength: 50,
      maxlength: 2000,
    },
    evidenceUrls: [String],

    // Status tracking
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED'],
      default: 'PENDING',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL',
      index: true,
    },

    // Assignment
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedAt: Date,

    // Review
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewDecision: {
      type: String,
      enum: ['APPROVE', 'REJECT', 'ESCALATE'],
    },
    reviewNotes: String,
    internalNotes: String,

    // Escalation
    escalatedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    escalatedAt: Date,
    escalationReason: String,

    // Response
    responseMessage: String,

    // Metrics
    responseTime: Number,
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
appealSchema.index({ status: 1, priority: -1, createdAt: 1 });
appealSchema.index({ assignedTo: 1, status: 1 });

export const Appeal = mongoose.model('Appeal', appealSchema);

```

### `src/models/bookmark.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { IBookmarkDoc } from '@features/bookmark/types/bookmark.types';

const bookmarkSchema = new Schema<IBookmarkDoc>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
    },
    storySlug: {
      type: String,
      required: true,
      index: true,
    },
    chapterSlug: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Unique: one bookmark per user per story
bookmarkSchema.index({ userId: 1, chapterSlug: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, storySlug: 1 });

const Bookmark = mongoose.model<IBookmarkDoc>('Bookmark', bookmarkSchema);

export { Bookmark };

```

### `src/models/chapter.model.ts`

```typescript
import {
  CHAPTER_PR_STATUSES,
  CHAPTER_STATUSES,
  ChapterStatus,
} from '@features/chapter/types/chapter-enum';
import { IChapterDoc } from '@features/chapter/types/chapter.types';
import mongoose, { Schema } from 'mongoose';

const chapterSchema = new Schema<IChapterDoc>(
  {
    storySlug: {
      type: String,
      required: true,
      index: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Tree structure
    parentChapterSlug: {
      type: String,
      default: null,
      index: true,
    },
    ancestorSlugs: {
      type: [String],
      default: [],
      index: true,
    },
    depth: {
      type: Number,
      default: 0,
      min: 0,
    },
    branchIndex: {
      type: Number,
      required: true,
      min: 1,
    },

    // Author
    authorId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    // Content
    content: {
      type: String,
      required: true,
      minlength: 50,
      maxlength: 10000,
    },
    title: {
      type: String,
      maxlength: 200,
      trim: true,
    },
    chapterNumber: {
      type: Number,
      min: 1,
    },

    // Voting
    votes: {
      upvotes: { type: Number, default: 0 },
      downvotes: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
    },

    // Status
    status: {
      type: String,
      enum: CHAPTER_STATUSES,
      default: ChapterStatus.PUBLISHED,
    },
    isEnding: {
      type: Boolean,
      default: false,
    },

    // Pull Request info
    pullRequest: {
      isPR: { type: Boolean, default: false },
      prId: { type: Schema.Types.ObjectId, ref: 'PullRequest' },
      status: {
        type: String,
        enum: CHAPTER_PR_STATUSES,
      },
      submittedAt: Date,
      reviewedBy: { type: String, ref: 'User' },
      reviewedAt: Date,
      rejectionReason: String,
    },

    // Version control
    version: {
      type: Number,
      default: 1,
    },
    previousVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'ChapterVersion',
    },

    // Statistics
    stats: {
      reads: { type: Number, default: 0 },
      uniqueReaders: { type: Number, default: 0 },

      completions: { type: Number, default: 0 },
      dropOffs: { type: Number, default: 0 },

      totalReadTime: { type: Number, default: 0 }, // sum of all users
      avgReadTime: { type: Number, default: 0 },

      completionRate: { type: Number, default: 0 }, // percentage
      engagementScore: { type: Number, default: 0 }, // 0-100 score

      comments: { type: Number, default: 0 },
      childBranches: { type: Number, default: 0 },
    },

    // Moderation
    reportCount: {
      type: Number,
      default: 0,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
chapterSchema.index({ storySlug: 1, parentChapterSlug: 1 });
chapterSchema.index({ storySlug: 1, ancestorSlugs: 1 });
chapterSchema.index({ authorId: 1, createdAt: -1 });
chapterSchema.index({ 'votes.score': -1 });
chapterSchema.index({ status: 1 });

const Chapter = mongoose.model<IChapterDoc>('Chapter', chapterSchema);

export { Chapter };

```

### `src/models/chapterAutoSave.modal.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { IChapterAutoSaveDoc } from '@features/chapterAutoSave/types/chapterAutoSave.types';

const chapterAutoSaveSchema = new Schema<IChapterAutoSaveDoc>(
  {
    /**
     * CHAPTER_ID: Which chapter is being auto-saved?
     * USE: Link autosave to chapter
     * REFERENCE: Links to Chapter document
     */
    chapterSlug: {
      type: String,
      default: null,
      index: true,
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
    storySlug: {
      type: String,
      required: true,
      index: true,
    },

    /**
     * PARENT_CHAPTER_ID: Which is the parent chapter?
     * USE: For new_chapter and update types - track parent relationship
     * REFERENCE: Links to Chapter document
     */
    parentChapterSlug: {
      type: String,
      default: null,
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

```

### `src/models/chapterVersion.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { IChapterVersionDoc } from '@features/chapterVersion/types/chapterVersion.types';
import { CHAPTER_VERSION_EDIT_TYPES } from '@features/chapterVersion/types/chapterVersion-enum';

const chapterVersionSchema = new Schema<IChapterVersionDoc>(
  {
    chapterSlug: {
      type: String,
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    title: String,
    editedBy: {
      type: String,
      ref: 'User',
      required: true,
    },
    editReason: {
      type: String,
      maxlength: 500,
    },
    changesSummary: {
      type: String,
      maxlength: 1000,
    },
    editType: {
      type: String,
      enum: CHAPTER_VERSION_EDIT_TYPES,
      default: 'manual_edit',
      index: true,
    },
    prId: {
      type: Schema.Types.ObjectId,
      ref: 'PullRequest',
    },
    previousVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'ChapterVersion',
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    moderationInfo: {
      hiddenBy: {
        type: String,
        ref: 'User',
      },
      hiddenAt: Date,
      reasonHidden: {
        type: String,
        maxlength: 500,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
chapterVersionSchema.index({ chapterSlug: 1, version: -1 });
chapterVersionSchema.index({ isVisible: 1 });

const ChapterVersion = mongoose.model('ChapterVersion', chapterVersionSchema);

export { ChapterVersion };

```

### `src/models/comment.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { ICommentDoc } from '@features/comment/types/comment.types';

const commentSchema = new Schema<ICommentDoc>({
  chapterSlug: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    ref: 'User',
    required: true,
    index: true,
  },

  // Nested comments
  parentCommentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true,
  },

  content: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 2000,
  },

  // Voting on comments
  votes: {
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  // Moderation
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  reportCount: {
    type: Number,
    default: 0,
  },
});

// Indexes
commentSchema.index({ chapterSlug: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1 });

const Comment = mongoose.model<ICommentDoc>('Comment', commentSchema);

export { Comment };

```

### `src/models/commentVote.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';

import { ICommentVoteDoc } from '@/features/commentVote/types/commentVote.types';

const commentVoteSchema = new Schema<ICommentVoteDoc>(
  {
    commentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      required: true,
      index: true,
    },
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    voteType: {
      type: String,
      enum: ['upvote', 'downvote'],
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate voting
commentVoteSchema.index({ commentId: 1, userId: 1 }, { unique: true });

export const CommentVote = mongoose.model<ICommentVoteDoc>('CommentVote', commentVoteSchema);

```

### `src/models/follow.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { IFollowDoc } from '@features/follow/types/follow.types';

const followSchema = new Schema<IFollowDoc>({
  followerId: {
    type: String,
    ref: 'User',
    required: true,
    index: true,
  },
  followingId: {
    type: String,
    ref: 'User',
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique: can't follow same person twice
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

const Follow = mongoose.model('Follow', followSchema);

export { Follow };

```

### `src/models/notification.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { INotificationDoc } from '@features/notification/types/notification.types';
import { NOTIFICATION_TYPES } from '@features/notification/types/notification-enum';

// One notification collection handles EVERYTHING
const notificationSchema = new Schema<INotificationDoc>({
  userId: { type: String, ref: 'User', required: true, index: true },

  // Type determines what kind of notification it is
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    required: true,
    index: true,
  },

  // Generic references (only use what's relevant for each type)
  relatedStorySlug: { type: String, ref: 'Story' },
  relatedChapterSlug: { type: String, ref: 'Chapter' },
  relatedPullRequestId: { type: Schema.Types.ObjectId, ref: 'PullRequest' },
  relatedCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
  relatedUserId: { type: String, ref: 'User' }, // Who triggered it

  // Content
  title: { type: String, required: true },
  message: { type: String, required: true },

  // Status
  isRead: { type: Boolean, default: false, index: true },
  readAt: Date,

  // Action (optional link to take user to relevant page)
  actionUrl: String,
});

const Notification = mongoose.model('Notification', notificationSchema);

export { Notification };

```

### `src/models/platformRole.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { IPlatformRoleDoc } from '@features/platformRole/types/platformRole.types';

const platformRoleSchema = new Schema<IPlatformRoleDoc>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'PLATFORM_MODERATOR', 'APPEAL_MODERATOR', 'USER'],
      default: 'USER',
      index: true,
    },
    assignedBy: String,
    assignedAt: Date,
  },
  { timestamps: true }
);

// Ensure only one SUPER_ADMIN can exist at the DB level by using a partial
// unique index on the `role` field for value 'SUPER_ADMIN'. This lets the
// application keep using transactions but guarantees uniqueness under
// concurrent signups.
platformRoleSchema.index(
  { role: 1 },
  { unique: true, partialFilterExpression: { role: 'SUPER_ADMIN' } }
);

export const PlatformRole = mongoose.model<IPlatformRoleDoc>('PlatformRole', platformRoleSchema);

```

### `src/models/prComment.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { IPRCommentDoc } from '@features/prComment/types/prComment.types';
import { PRCommentType, PR_COMMENT_TYPES } from '@features/prComment/types/prComment-enum';

const prCommentSchema = new Schema<IPRCommentDoc>(
  {
    /**
     * PULL_REQUEST_ID: Which PR is this comment on?
     * USE: Find all comments for a specific PR
     * IMMUTABLE: Set once on creation
     * INDEX: Primary lookup, used heavily for pagination
     */
    pullRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'PullRequest',
      required: true,
      index: true,
    },
    /**
     * USER_ID: Who wrote this comment?
     * USE: Show comment author, track user contributions
     * IMMUTABLE: Set once on creation
     * PERMISSIONS: Author can edit/delete own comments
     * REFERENCE: Links to User document
     */
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    /**
     * PARENT_COMMENT_ID: Is this a reply to another comment?
     * USE: Build comment threads
     * DEFAULT: null (for top-level comments)
     * STRUCTURE: Enables nested discussions
     * EXAMPLE: null for main comment, set to that comment's ID for replies
     * THREADING: Allows grouped conversation threads
     * WHEN_SET: When user clicks "Reply" on existing comment
     * REFERENCE: Links to another PRComment (self-reference)
     */
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: 'PRComment',
      default: null,
    },
    /**
     * CONTENT: The actual comment text
     * USE: Display comment in UI, search/filter comments
     * REQUIRED: Cannot be empty
     * LENGTH: 1-2000 characters
     * EDITABLE: Author can change after posting
     * WHEN_UPDATE: User clicks edit and changes text
     * NOTIFY: Update editedAt timestamp when edited
     * PRESERVE: Keep old version in audit if needed
     */
    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 2000,
    },

    /**
     * COMMENT_TYPE: What kind of comment is this?
     * VALUES:
     *   - GENERAL: Regular discussion/feedback
     *   - SUGGESTION: Proposes specific text change
     *   - QUESTION: Asks for clarification
     *   - APPROVAL: Positive feedback/support
     *   - REQUEST_CHANGES: Flags problem needing fix
     * USE: Filter/highlight comments by type, different UI rendering
     * DEFAULT: GENERAL if not specified
     * WHEN_SET: Author selects type when submitting
     * AFFECTS:
     *   - SUGGESTION type shows suggestion details
     *   - REQUEST_CHANGES appears in approval tracking
     *   - APPROVAL can contribute to vote count
     */
    commentType: {
      type: String,
      enum: PR_COMMENT_TYPES,
      default: PRCommentType.GENERAL,
    },
    /**
     * SUGGESTION: Proposed text change (for SUGGESTION type)
     * USE: When comment is a specific text fix proposal
     * ONLY_FOR: commentType === 'SUGGESTION'
     * OPTIONAL: Empty if commentType is not SUGGESTION
     */
    suggestion: {
      line: Number,
      originalText: String,
      suggestedText: String,
    },

    /**
     * IS_EDITED: Has this comment been modified?
     * USE: Show "edited" indicator in UI
     * DEFAULT: false (new comments)
     * UPDATE: Set to true when author edits
     * TRANSPARENCY: Users can see if comment was edited
     * PRESERVE: Keep creation time, just mark as edited
     */
    isEdited: { type: Boolean, default: false },
    editedAt: Date,

    /**
     * IS_RESOLVED: Has this comment/thread been addressed?
     * USE: Mark comments as resolved/done
     * DEFAULT: false (new comments)
     * UPDATE:
     *   - Set to true when issue is fixed
     *   - Can be toggled (reopen if needed)
     * MARKING_AS_RESOLVED: PR author marks when they've addressed it
     * VISUAL: Resolved comments can be collapsed/hidden
     */
    isResolved: { type: Boolean },

    /**
     * RESOLVED_BY: Who marked this as resolved?
     * USE: Know who confirmed the fix
     * USUALLY: PR author who made the fix
     * ALTERNATIVE: Can be reviewer if they approve fix
     * IMMUTABLE: Once set, doesn't change
     */
    resolvedBy: { type: String, ref: 'User' },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
prCommentSchema.index({ pullRequestId: 1, createdAt: 1 });
prCommentSchema.index({ userId: 1, createdAt: -1 });

const PRComment = mongoose.model('PRComment', prCommentSchema);

export { PRComment };

```

### `src/models/prReview.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { IPRReviewDoc } from '@features/prReview/types/prReview.types';
import { PRReviewStatus, PR_REVIEW_STATUSES } from '@features/prReview/types/prReview-enum';

const prReviewSchema = new Schema<IPRReviewDoc>(
  {
    pullRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'PullRequest',
      required: true,
      index: true,
    },
    reviewerId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    /**
     * REVIEW_STATUS: Detailed review progress (non-terminal, changes during process)
     * VALUES:
     *   - PENDING_REVIEW: Waiting for reviewers
     *   - IN_REVIEW: At least one reviewer started
     *   - CHANGES_REQUESTED: Reviewer(s) requested changes, author must update
     *   - APPROVED: All reviews received, all approved
     *   - NEEDS_WORK: Changes requested must be addressed
     *   - DRAFT: Author paused review (uses isDraft field)
     * USE: Show detailed progress in UI, determine next steps
     * UPDATE:
     *   - On creation: PENDING_REVIEW
     *   - When review submitted: IN_REVIEW
     *   - When REQUEST_CHANGES review added: CHANGES_REQUESTED
     *   - When all approvals: APPROVED
     *   - When author marks draft: DRAFT
     * RELATIONSHIP: Works with status field for full state picture
     */
    reviewStatus: {
      type: String,
      enum: PR_REVIEW_STATUSES,
      default: PRReviewStatus.PENDING_REVIEW,
      index: true,
    },
    summary: {
      type: String,
      maxlength: 2000,
    },
    feedback: [
      {
        section: String,
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
      },
    ],
    overallRating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
prReviewSchema.index({ pullRequestId: 1, createdAt: -1 });
prReviewSchema.index({ reviewerId: 1 });
prReviewSchema.index({ pullRequestId: 1, reviewerId: 1 }, { unique: true });

const PRReview = mongoose.model('PRReview', prReviewSchema);

export { PRReview };

```

### `src/models/prVote.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { IPRVoteDoc } from '@features/prVote/types/prVote.types';

const prVoteSchema = new Schema<IPRVoteDoc>({
  pullRequestId: {
    type: Schema.Types.ObjectId,
    ref: 'PullRequest',
    required: true,
    index: true,
  },
  userId: {
    type: String,
    ref: 'User',
    required: true,
    index: true,
  },
  vote: {
    type: Number,
    required: true,
    enum: [1, -1],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique: one vote per user per PR
prVoteSchema.index({ pullRequestId: 1, userId: 1 }, { unique: true });

const PRVote = mongoose.model('PRVote', prVoteSchema);

export { PRVote };

```

### `src/models/pullRequest.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { IPullRequestDoc } from '@features/pullRequest/types/pullRequest.types';
import {
  PR_LABELS,
  PR_STATUSES,
  PR_TYPES,
  PR_TIMELINE_ACTIONS,
  PRStatus,
  PRType,
} from '@features/pullRequest/types/pullRequest-enum';

const pullRequestSchema = new Schema<IPullRequestDoc>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
      default: '',
    },

    // References
    storySlug: {
      type: String,
      required: true,
      index: true,
    },
    chapterSlug: {
      type: String,
      required: true,
      index: true,
    },

    /**
     * PARENT_CHAPTER_SLUG: Which chapter is this branching from?
     * USE: For branch management, understand the chapter tree
     * UPDATE: Set once on creation for branching PRs
     * REFERENCE: Links to parent Chapter in story structure
     * NOTE: For edits to main chapter, this equals chapterSlug
     */
    parentChapterSlug: {
      type: String,
      required: true,
      index: true,
    },
    authorId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    // ==================== PR TYPE ====================

    /**
     * PR_TYPE: What kind of change is this?
     * VALUES:
     *   - NEW_CHAPTER: Adding entirely new chapter
     *   - EDIT_CHAPTER: Modifying existing chapter
     *   - DELETE_CHAPTER: Removing a chapter
     * USE: Determine how to apply changes when merged, different review criteria
     * UPDATE: Set once on creation, never changes
     * LOGIC: Affects merge behavior:
     *   - NEW_CHAPTER: Create new chapter from proposed content
     *   - EDIT_CHAPTER: Replace chapter content with proposed
     *   - DELETE_CHAPTER: Mark chapter as deleted (soft delete)
     */
    prType: {
      type: String,
      enum: PR_TYPES,
      default: PRType.NEW_CHAPTER,
    },

    // ==================== CHANGES ====================
    /**
     * CHANGES: The actual content modifications
     */
    changes: {
      /**
       * ORIGINAL: Previous content (for comparison)
       * USE: Generate diff, show what changed, in PRDiff service
       * UPDATE: Set once on creation
       * STORE: Only if EDIT_CHAPTER or DELETE_CHAPTER (NEW_CHAPTER has no original)
       * SIZE: Can be large, consider storing in separate collection if > 1MB
       */
      original: {
        type: String,
        maxlength: 100000,
      },

      /**
       * PROPOSED: New content being suggested
       * USE: What will be applied to chapter if PR merges
       * UPDATE: Can be updated by author before first review
       * REQUIRED: Always present - this is the main change
       * SIZE: Can be large, capped at 100KB to prevent abuse
       */
      proposed: {
        type: String,
        required: true,
        maxlength: 100000,
      },

      wordCount: Number,

      readingMinutes: Number,
    },

    // ==================== STATUS ====================

    /**
     * STATUS: Main PR status (terminal states)
     * VALUES:
     *   - OPEN: Initial state, under review or waiting for reviews
     *   - APPROVED: All required reviews received and approved
     *   - REJECTED: Explicitly rejected, cannot be merged
     *   - CLOSED: Manually closed without merging
     *   - MERGED: Successfully merged into story
     * USE: Filter PRs, determine actions available
     * UPDATE:
     *   - On creation: OPEN
     *   - When all approvals received: APPROVED
     *   - When force-closed: CLOSED
     *   - When merged: MERGED
     * INDEX: Heavily queried - include in compound indexes
     * FLOW: OPEN -> APPROVED -> MERGED (or OPEN -> CLOSED, or OPEN -> REJECTED)
     */
    status: {
      type: String,
      enum: PR_STATUSES,
      default: PRStatus.OPEN,
      required: true,
      index: true,
    },

    // ==================== VOTING AGGREGATE ====================
    /**
     * VOTES: Vote counts (actual votes stored in separate PRVote schema)
     * WHY SEPARATE: Allows efficient querying, prevents document bloat,
     *               enables vote tracking and analytics
     * UPDATE: Aggregated from PRVote collection
     * USE: Quick access to vote counts without joining PRVote
     */
    votes: {
      /**
       * UPVOTES: Count of positive votes
       * USE: Show community approval
       * UPDATE: Increment/decrement when PRVote added/removed
       * SYNC: Keep in sync with PRVote count via PRService.syncVoteCounts()
       */
      upvotes: {
        type: Number,
        default: 0,
        min: 0,
        index: true,
      },

      /**
       * DOWNVOTES: Count of negative votes
       * USE: Show community concerns
       * UPDATE: Increment/decrement when PRVote added/removed
       * SYNC: Keep in sync with PRVote count
       */
      downvotes: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * SCORE: Net vote score (upvotes - downvotes)
       * USE: Ranking PRs by community support, auto-approval trigger
       * UPDATE: Calculated as upvotes - downvotes
       * CALCULATE: upvotes - downvotes
       * INDEX: Used for sorting PRs by popularity
       * AUTO_APPROVE_TRIGGER: When score >= autoApprove.threshold
       */
      score: {
        type: Number,
        default: 0,
        index: true,
      },
    },

    // ==================== COMMENT COUNT AGGREGATE ====================
    /**
     * COMMENT_COUNT: Number of comments on PR
     * WHY SEPARATE SCHEMA: Comments stored in PRComment schema for:
     *   - Scalability (PRs can have 1000s of comments)
     *   - Efficient pagination
     *   - Separate comment threading
     *   - Better indexing on comments
     * USE: Show activity level, quick stat in UI
     * UPDATE: Increment when PRComment created, decrement on delete
     * SYNC: Keep in sync with actual PRComment count via cron or hook
     */
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    // ==================== AUTO-APPROVAL CONFIG ====================
    /**
     * AUTO_APPROVE: Configuration for automatic approval
     * USE: Allow PRs to merge automatically when conditions met
     * WHEN_TO_USE: Enable for trusted contributors, simple PRs
     * DEFAULT: Disabled (requires manual approval)
     */
    autoApprove: {
      /**
       * ENABLED: Is auto-approval active for this PR?
       * DEFAULT: false (manual approval required)
       * UPDATE: Set per PR or inherit from story settings
       * DISABLE: Can be overridden by STORY_CREATOR if needed
       */
      enabled: {
        type: Boolean,
        default: false,
      },

      /**
       * THRESHOLD: Vote count required to auto-approve
       * UNIT: Net votes (upvotes - downvotes)
       * DEFAULT: 10 (can be customized per story)
       * UPDATE: Set on creation from story settings
       * LOGIC: If votes.score >= threshold, auto-approve
       * EXAMPLE: threshold=10 means need 10+ more upvotes than downvotes
       */
      threshold: {
        type: Number,
        default: 10,
        min: 1,
      },

      /**
       * TIME_WINDOW: Days to accumulate votes before auto-approval
       * UNIT: Days
       * DEFAULT: 7 (votes must accumulate within one week)
       * UPDATE: Set on creation from story settings
       * LOGIC: PR can only auto-approve if created <= timeWindow days ago
       * PREVENTS: Very old PRs auto-approving after months
       * EXAMPLE: timeWindow=7 means PR created more than 7 days ago won't auto-approve
       */
      timeWindow: {
        type: Number,
        default: 7,
        min: 1,
      },

      /**
       * QUALIFIED_AT: When did PR first qualify for auto-approval?
       * USE: Track when auto-approval became possible
       * UPDATE: Set once when score reaches threshold
       * LOCK: Once set, can only auto-approve if still in timeWindow
       */
      qualifiedAt: Date,

      /**
       * AUTO_APPROVED_AT: When was auto-approval actually applied?
       * USE: Know when/if automatic approval happened
       * UPDATE: Set when auto-approval logic executes
       * EMPTY: If null, means PR hasn't auto-approved yet (might not qualify)
       */
      autoApprovedAt: Date,
    },

    // ==================== LABELS ====================
    /**
     * LABELS: Tags to categorize PR
     * USE: Filter PRs in UI, organize review queue
     * UPDATE: Add/remove by STORY_CREATOR or MODERATOR
     * CONSTRAINTS: Limited set of allowed labels
     * PREDEFINED_LABELS:
     *   - NEEDS_REVIEW: Still needs reviewer attention
     *   - QUALITY_ISSUE: Content quality concerns flagged
     *   - GRAMMAR: Grammar/spelling issues noted
     *   - PLOT_HOLE: Story inconsistency detected
     *   - GOOD_FIRST_PR: Good for new contributors to review
     */
    labels: [
      {
        type: String,
        enum: PR_LABELS,
      },
    ],

    // ==================== MERGE INFO ====================
    /**
     * MERGED_AT: When was this PR merged?
     * USE: Know if/when PR was merged
     * UPDATE: Set when PR merged (status changed to MERGED)
     * EMPTY: null if status != MERGED
     * IMMUTABLE: Once set, never changes
     */
    mergedAt: Date,

    /**
     * MERGED_BY: Who performed the merge?
     * USE: Track who merged the PR (could be author, reviewer, or system)
     * UPDATE: Set when PR merged
     * PERMISSIONS: Must be EDITOR+ to merge
     * VALUE: System if auto-merged
     */
    mergedBy: {
      type: String,
      ref: 'User',
    },

    /**
     * CLOSED_AT: When was this PR closed without merging?
     * USE: Track closed PRs
     * UPDATE: Set when PR closed (status changed to CLOSED)
     * EMPTY: null if status != CLOSED
     */
    closedAt: Date,

    /**
     * CLOSED_BY: Who closed the PR?
     * USE: Track who made the decision to close
     * UPDATE: Set when PR closed
     * PERMISSIONS: Author or STORY_CREATOR can close
     */
    closedBy: {
      type: String,
      ref: 'User',
    },

    /**
     * CLOSE_REASON: Why was this PR closed?
     * USE: Document reason for closure (superceded, duplicate, etc)
     * UPDATE: Set when PR closed
     * EXAMPLE: "Duplicate of PR #123", "Changes no longer needed"
     */
    closeReason: {
      type: String,
      maxlength: 500,
    },

    /**
     * IS_DRAFT: Has author paused review?
     * USE: Prevent auto-approval while in draft
     * UPDATE:
     *   - Set true: When author calls markAsDraft()
     *   - Set false: When author calls markReadyForReview()
     * EFFECT: If true, PR won't auto-approve even if threshold met
     * REASON: Author needs more time before review
     */
    isDraft: {
      type: Boolean,
      default: false,
    },

    /**
     * DRAFT_REASON: Why did author pause review?
     * USE: Inform reviewers of delay reason
     * UPDATE: Set when marked as draft
     * EXAMPLE: "Working on feedback", "Waiting for story context"
     */
    draftReason: String,

    /**
     * DRAFTED_AT: When was PR marked as draft?
     * USE: Know how long PR has been paused
     * UPDATE: Set when marked as draft
     */
    draftedAt: Date,

    // ==================== TIMELINE ====================
    /**
     * TIMELINE: High-level action history
     * USE: Show PR lifecycle: created -> reviewed -> approved -> merged
     * UPDATE: Append new entry for each major action
     * SEPARATE: Detailed reviews/comments in separate schemas
     * ACTIONS:
     *   - CREATED: PR submitted
     *   - REVIEW_REQUESTED: Reviewer assigned
     *   - REVIEW_SUBMITTED: Reviewer decision received
     *   - APPROVED: All approvals received
     *   - CHANGES_REQUESTED: Changes needed
     *   - VOTED: User voted
     *   - AUTO_APPROVED: Voted to approval threshold
     *   - MERGED: PR merged to story
     *   - CLOSED: PR closed without merge
     *   - REOPENED: Closed PR was reopened
     *   - MARKED_DRAFT: Author paused review
     *   - READY_FOR_REVIEW: Author resumed review
     */
    timeline: [
      {
        /**
         * ACTION: What happened?
         * VALUES: CREATED, REVIEW_SUBMITTED, APPROVED, MERGED, etc
         */
        action: {
          type: String,
          enum: PR_TIMELINE_ACTIONS,
          required: true,
        },

        /**
         * PERFORMED_BY: Who did it?
         * USER_ID: The user who initiated action
         * SYSTEM: null if system-generated (auto-approval)
         */
        performedBy: String,

        /**
         * PERFORMED_AT: When did it happen?
         * USE: Build timeline visualization
         */
        performedAt: {
          type: Date,
          default: Date.now,
        },

        /**
         * METADATA: Extra context for this action
         * USE: Store action-specific details
         * EXAMPLES:
         *   - On REVIEW_SUBMITTED: { decision: 'APPROVE', score: 4.5 }
         *   - On AUTO_APPROVED: { votesReached: 12, threshold: 10 }
         *   - On MERGED: { byUser: 'mod1', version: 2 }
         */
        metadata: Schema.Types.Mixed,
      },
    ],

    // ==================== STATS ====================
    /**
     * STATS: Engagement and performance metrics
     */
    stats: {
      /**
       * VIEWS: How many times was PR viewed?
       * USE: Measure interest/engagement
       * UPDATE: Increment when PR page loaded
       * CAVEAT: Browser cache might undercount views
       */
      views: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * DISCUSSIONS: Number of discussion threads?
       * USE: Gauge how much back-and-forth discussion
       * UPDATE: Increment when comment thread created
       * RELATIONSHIP: Related to commentCount but different metric
       */
      discussions: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * REVIEWS_RECEIVED: How many reviews were submitted?
       * USE: Quick stat of review count
       * UPDATE: Count actual reviews in PRReview schema
       * SYNC: Keep in sync via PRService.syncReviewCount()
       */
      reviewsReceived: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // ==================== APPROVAL STATUS ====================
    /**
     * APPROVALS_STATUS: Track required vs received approvals
     * USE: Know if PR ready to merge
     * UPDATE: When review submitted, voted, changes requested
     */
    approvalsStatus: {
      /**
       * REQUIRED: How many approvals needed?
       * DEFAULT: Usually 1 or 2 (configured per story)
       * UPDATE: Set on creation from story settings
       * SOURCE: Pulled from story.settings.prSettings.minApprovals
       */
      required: {
        type: Number,
        default: 1,
      },

      /**
       * RECEIVED: How many approvals received so far?
       * USE: Track progress toward merge
       * UPDATE: Increment when APPROVE review submitted
       * DECREMENT: If approval withdrawn/changed
       */
      received: {
        type: Number,
        default: 0,
      },

      /**
       * PENDING: How many more approvals needed?
       * CALCULATE: required - received
       * USE: Quick check - if 0, ready to merge
       * READONLY: Calculated field, not directly set
       */
      pending: {
        type: Number,
        default: 0,
      },

      /**
       * APPROVERS: List of users who approved
       * USE: Show who approved in timeline
       * UPDATE: Add reviewerId when APPROVE review added
       * REMOVE: If approval withdrawn
       */
      approvers: [String],

      /**
       * BLOCKERS: Users who requested changes (blocking approval)
       * USE: Show who blocked merge, visual indicator
       * UPDATE: Add reviewerId when REQUEST_CHANGES review added
       * CLEAR: Remove when author addresses changes/blocker withdraws
       */
      blockers: [String],

      /**
       * CAN_MERGE: Is PR ready to merge right now?
       * CALCULATE: received >= required && blockers.length === 0
       * USE: Enable/disable merge button in UI
       * READONLY: Computed field
       */
      canMerge: {
        type: Boolean,
        default: false,
      },
    },

    // ==================== MODERATION ====================
    /**
     * REQUIRES_MODERATION: Should moderation team review?
     * USE: Flag for content policy violations
     * UPDATE: Set by auto-detection or manual flag
     */
    requiresModeration: {
      type: Boolean,
      default: false,
    },

    /**
     * FLAGGED_FOR_REVIEW: Manual flag by moderator
     * USE: Mark for manual review
     * UPDATE: By MODERATOR+ when content looks suspicious
     */
    flaggedForReview: {
      type: Boolean,
      default: false,
    },

    /**
     * MODERATION_NOTES: Why was this flagged?
     * USE: Document moderation concerns
     * UPDATE: Set when flagged for review
     * EXAMPLE: "Contains potential harassment", "Copyright concern"
     */
    moderationNotes: String,

    /**
     * REPORT_IDS: Related moderation reports
     * USE: Link to Report documents
     * UPDATE: When report filed against PR content
     */
    reportIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Report',
      },
    ],

    // ==================== CONFLICT TRACKING ====================
    /**
     * HAS_CONFLICTS: Does this PR conflict with others?
     * USE: Alert reviewers of merge conflicts
     * UPDATE: Calculated when checking merge eligibility
     */
    // hasConflicts: {
    //   type: Boolean,
    //   default: false,
    // },

    /**
     * CONFLICT_DESCRIPTION: What conflicts exist?
     * USE: Document nature of conflicts
     * UPDATE: When conflicts detected
     * EXAMPLE: "Conflicts with PR #5 on lines 10-20"
     */
    // conflictDescription: String,

    /**
     * CONFLICT_RESOLVED_AT: When were conflicts resolved?
     * USE: Track resolution
     * UPDATE: When author resolves conflicts
     */
    // conflictResolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
pullRequestSchema.index({ storySlug: 1, status: 1, createdAt: -1 });
pullRequestSchema.index({ authorId: 1, status: 1 });
pullRequestSchema.index({ 'votes.score': -1 });

const PullRequest = mongoose.model<IPullRequestDoc>('PullRequest', pullRequestSchema);

export { PullRequest };

```

### `src/models/readingHistory.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import {
  IReadingHistoryDoc,
  IChapterReadDoc,
} from '@features/readingHistory/types/readingHistory.types';

const chapterReadSchema = new Schema<IChapterReadDoc>(
  {
    chapterSlug: {
      type: String,
      ref: 'Chapter',
      required: true,
    },

    // Time tracking
    totalReadTime: {
      type: Number, // seconds
      default: 0,
    },

    lastHeartbeatAt: {
      type: Date,
      default: null,
    },

    // Multi-tab protection
    activeSessionId: {
      type: String,
      default: null,
    },

    // Unique reader flag
    hasQualifiedRead: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const readingHistorySchema = new Schema<IReadingHistoryDoc>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    storySlug: {
      type: String,
      ref: 'Story',
      required: true,
      index: true,
    },

    // Current position
    currentChapterSlug: {
      type: String,
      ref: 'Chapter',
      default: null,
    },

    // Path taken
    chaptersRead: [chapterReadSchema],

    // Statistics
    lastReadAt: {
      type: Date,
      default: Date.now,
    },

    totalStoryReadTime: {
      type: Number,
      default: 0,
    },

    completedEndingChapters: {
      type: [String],
      default: [],
    },

    completedPaths: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: false,
  }
);

// Unique: one history per user per story
readingHistorySchema.index({ userId: 1, storySlug: 1 }, { unique: true });
readingHistorySchema.index({ userId: 1, lastReadAt: -1 });

const ReadingHistory = mongoose.model<IReadingHistoryDoc>('ReadingHistory', readingHistorySchema);
const ChapterRead = mongoose.model<IChapterReadDoc>('ChapterRead', chapterReadSchema);

export { ReadingHistory, ChapterRead };

```

### `src/models/report.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { IReportDoc } from '@features/report/types/report.types';

const reportSchema = new Schema<IReportDoc>(
  {
    reporterId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    // What's being reported
    reportType: {
      type: String,
      required: true,
      enum: ['CHAPTER', 'COMMENT', 'USER', 'STORY'],
    },
    relatedChapterSlug: { type: String, ref: 'Chapter' },
    relatedCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    relatedUserId: { type: String, ref: 'User' },
    relatedStorySlug: { type: String, ref: 'Story' },

    // Report details
    reason: {
      type: String,
      required: true,
      enum: ['SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'COPYRIGHT', 'OFF_TOPIC', 'OTHER'],
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    // Moderation
    status: {
      type: String,
      enum: ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'],
      default: 'PENDING',
      index: true,
    },
    reviewedBy: { type: String, ref: 'User' },
    reviewedAt: Date,
    resolution: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporterId: 1 });

const Report = mongoose.model('Report', reportSchema);

export { Report };

```

### `src/models/session.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { ISessionDoc } from '@features/sesstion/types/sesstion.types';

const sessionSchema = new Schema<ISessionDoc>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  clientId: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'revoked'],
    default: 'active',
  },
  ip: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
  },
  lastActiveAt: {
    type: Date,
  },
  expireAt: {
    type: Date,
  },
  abandonAt: {
    type: Date,
  },
});

sessionSchema.index({ userId: 1, status: 1 });

const Session = mongoose.model('Session', sessionSchema);

export { Session };

```

### `src/models/story.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { IStoryDoc } from '@features/story/types/story.types';
import {
  STORY_CONTENT_RATINGS,
  STORY_GENRES,
  STORY_STATUSES,
  StoryStatus,
} from '@/features/story/types/story-enum';

const storySchema = new Schema<IStoryDoc>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
      index: 'text',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
      index: 'text',
    },
    coverImage: {
      url: String,
      publicId: String,
    },
    cardImage: {
      url: String,
      publicId: String,
    },

    // Creator
    creatorId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    // Settings
    settings: {
      isPublic: { type: Boolean, default: false }, // If false, only creator/collaborators can view
      allowBranching: { type: Boolean, default: false }, // If true, readers can create branches
      requireApproval: { type: Boolean, default: true }, // If true, branches need approval from creator/collaborators
      allowComments: { type: Boolean, default: false }, // If true, readers can comment on chapters
      allowVoting: { type: Boolean, default: false }, // If true, readers can vote on the story

      // Metadata
      genres: {
        type: [String],
        enum: STORY_GENRES,
        default: [],
      },
      contentRating: {
        type: String,
        enum: STORY_CONTENT_RATINGS,
        default: 'general',
      },
    },

    // Statistics
    stats: {
      totalChapters: { type: Number, default: 0 },
      totalBranches: { type: Number, default: 0 },
      totalReads: { type: Number, default: 0 },
      totalVotes: { type: Number, default: 0 },
      upvotes: { type: Number, default: 0 },
      downvotes: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
      uniqueContributors: { type: Number, default: 1 },
      averageRating: { type: Number, default: 0, min: 0, max: 5 },
    },

    // Tags
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Status
    status: {
      type: String,
      enum: STORY_STATUSES,
      default: StoryStatus.DRAFT,
    },

    // Trending
    trendingScore: {
      type: Number,
      default: 0,
      index: -1,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: -1,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
storySchema.index({ creatorId: 1, publishedAt: -1 });
storySchema.index({ trendingScore: -1, publishedAt: -1 });
storySchema.index({ 'stats.totalReads': -1 });
storySchema.index({ 'stats.score': -1 });
storySchema.index({ tags: 1 });
storySchema.index({ title: 'text', description: 'text' });

const Story = mongoose.model<IStoryDoc>('Story', storySchema);

export { Story };

```

### `src/models/storyCollaborator.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { IStoryCollaboratorDoc } from '@features/storyCollaborator/types/storyCollaborator.types';
import {
  STORY_COLLABORATOR_ROLES,
  STORY_COLLABORATOR_STATUSES,
  StoryCollaboratorRole,
  StoryCollaboratorStatus,
} from '@/features/storyCollaborator/types/storyCollaborator-enum';

const storyCollaboratorSchema = new Schema<IStoryCollaboratorDoc>(
  {
    slug: {
      type: String,
      ref: 'Story',
      required: true,
      index: true,
    },
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: STORY_COLLABORATOR_ROLES,
      default: StoryCollaboratorRole.CONTRIBUTOR,
    },
    invitedBy: {
      type: String,
      ref: 'User',
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: Date,
    status: {
      type: String,
      enum: STORY_COLLABORATOR_STATUSES,
      default: StoryCollaboratorStatus.PENDING,
    },
  },
  {
    timestamps: true,
  }
);

// Unique: one role per user per story
storyCollaboratorSchema.index({ slug: 1, userId: 1 }, { unique: true });

const StoryCollaborator = mongoose.model<IStoryCollaboratorDoc>(
  'StoryCollaborator',
  storyCollaboratorSchema
);

export { StoryCollaborator };

```

### `src/models/user.model.ts`

```typescript
import { AUTH_PROVIDER } from '@/features/user/types/user-enum';
import { IUserDoc } from '@features/user/types/user.types';
import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema<IUserDoc>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    // Profile
    bio: {
      type: String,
      maxlength: 500,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },

    // Gamification
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    badges: [
      {
        type: String,
        enum: [
          'STORY_STARTER',
          'BRANCH_CREATOR',
          'TOP_CONTRIBUTOR',
          'MOST_UPVOTED',
          'TRENDING_AUTHOR',
          'VETERAN_WRITER',
          'COMMUNITY_FAVORITE',
          'COLLABORATIVE',
          'QUALITY_CURATOR',
        ],
      },
    ],

    // Statistics
    stats: {
      storiesCreated: { type: Number, default: 0 },
      chaptersWritten: { type: Number, default: 0 },
      totalUpvotes: { type: Number, default: 0 },
      totalDownvotes: { type: Number, default: 0 },
      branchesCreated: { type: Number, default: 0 },
    },

    // Preferences
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto',
      },
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: String,
    bannedUntil: Date,

    // Timestamps
    lastActive: {
      type: Date,
      default: Date.now,
    },

    authProvider: {
      type: String,
      enum: AUTH_PROVIDER,
      default: 'email',
      index: true,
    },
    connectedAccounts: [
      {
        provider: {
          type: String,
          enum: [...AUTH_PROVIDER.filter((p) => p !== 'email')],
          required: true,
        },
        providerAccountId: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          lowercase: true,
        },
        username: String, // GitHub username, etc.
        avatarUrl: String, // Provider-specific avatar
        connectedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    primaryAuthMethod: {
      type: String,
      enum: AUTH_PROVIDER,
      default: 'email',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false, // removes __v
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

// Indexes
userSchema.index({ xp: -1 });
userSchema.index({ 'stats.totalUpvotes': -1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model<IUserDoc>('User', userSchema);

export { User };

```

### `src/models/vote.model.ts`

```typescript
import mongoose, { Schema } from 'mongoose';
import { IVoteDoc } from '@features/vote/types/vote.types';

const voteSchema = new Schema<IVoteDoc>(
  {
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
      index: true,
    },
    storyId: {
      type: Schema.Types.ObjectId,
      ref: 'Story',
      index: true,
    },
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    vote: {
      type: Number,
      required: true,
      enum: [1, -1],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one vote per user per chapter
voteSchema.index(
  { chapterId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { chapterId: { $exists: true } },
  }
);

// Ensure one vote per user per story
voteSchema.index(
  { storyId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { storyId: { $exists: true } },
  }
);

// Validation to ensure either chapterId or storyId is present, but not both
voteSchema.pre('validate', function (next) {
  if (!this.chapterId && !this.storyId) {
    next(new Error('Vote must belong to either a Chapter or a Story'));
  } else if (this.chapterId && this.storyId) {
    next(new Error('Vote cannot belong to both a Chapter and a Story'));
  } else {
    next();
  }
});

const Vote = mongoose.model('Vote', voteSchema);

export { Vote };

```

