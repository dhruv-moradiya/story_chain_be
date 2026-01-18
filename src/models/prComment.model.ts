import mongoose, { Schema } from 'mongoose';
import { IPRCommentDoc } from '@features/prComment/types/prComment.types';

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
      enum: ['GENERAL', 'SUGGESTION', 'QUESTION', 'APPROVAL', 'REQUEST_CHANGES'],
      default: 'GENERAL',
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
    isResolved: { type: Boolean, default: false },

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
