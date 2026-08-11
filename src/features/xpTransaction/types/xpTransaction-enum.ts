export enum XpRewardReason {
  // Story Milestones
  STORY_MILESTONE_100_READS = 'STORY_MILESTONE_100_READS',
  STORY_MILESTONE_1000_READS = 'STORY_MILESTONE_1000_READS',
  STORY_MILESTONE_10000_READS = 'STORY_MILESTONE_10000_READS',

  // Chapter Rewards
  CHAPTER_SURVIVAL_BASE = 'CHAPTER_SURVIVAL_BASE',
  CHAPTER_SCORE_BONUS_10 = 'CHAPTER_SCORE_BONUS_10',
  CHAPTER_SCORE_BONUS_50 = 'CHAPTER_SCORE_BONUS_50',

  // Chapter Votes
  CHAPTER_UPVOTED = 'CHAPTER_UPVOTED',
  CHAPTER_DOWNVOTED = 'CHAPTER_DOWNVOTED',

  // PR Actions & Reviews
  PR_SUBMITTED = 'PR_SUBMITTED',
  PR_APPROVED = 'PR_APPROVED',
  PR_REJECTED = 'PR_REJECTED',
  REVIEW_PR = 'REVIEW_PR',

  // Comments
  COMMENT_SHORT = 'COMMENT_SHORT',
  COMMENT_LONG = 'COMMENT_LONG',
  RECEIVE_COMMENT = 'RECEIVE_COMMENT',

  // Follows
  FOLLOW_USER = 'FOLLOW_USER',
  GET_FOLLOWED = 'GET_FOLLOWED',

  // Moderation & Penalties
  VALID_REPORT = 'VALID_REPORT',
  STORY_SPAM_PENALTY = 'STORY_SPAM_PENALTY',
  CHAPTER_SPAM_PENALTY = 'CHAPTER_SPAM_PENALTY',
}

export enum XpSourceType {
  STORY_MILESTONE = 'story_milestone',
  CHAPTER_SURVIVAL = 'chapter_survival',
  CHAPTER_SCORE_BONUS = 'chapter_score_bonus',
  CHAPTER_VOTE = 'chapter_vote',
  PR_APPROVED = 'pr_approved',
  PR_REJECTED = 'pr_rejected',
  PR_REVIEW = 'pr_review',
  COMMENT_WRITTEN = 'comment_written',
  COMMENT_RECEIVED = 'comment_received',
  FOLLOW_RECEIVED = 'follow_received',
  VALID_REPORT = 'valid_report',
  PENALTY_SPAM = 'penalty_spam',
}

export const XP_REWARD_REASONS = Object.values(XpRewardReason);
export const XP_SOURCE_TYPES_LIST = Object.values(XpSourceType);
