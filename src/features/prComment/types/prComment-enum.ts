enum PRCommentType {
  GENERAL = 'general',
  SUGGESTION = 'suggestion',
  QUESTION = 'question',
  REQUEST_CHANGES = 'request_changes',
}

const PR_COMMENT_TYPES = ['general', 'suggestion', 'question', 'request_changes'] as const;

export { PRCommentType, PR_COMMENT_TYPES };
