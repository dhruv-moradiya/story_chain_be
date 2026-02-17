enum PRCommentType {
  GENERAL = 'general',
  SUGGESTION = 'suggestion',
  QUESTION = 'question',
  APPROVAL = 'approval',
  REQUEST_CHANGES = 'request_changes',
}

const PR_COMMENT_TYPES = [
  'general',
  'suggestion',
  'question',
  'approval',
  'request_changes',
] as const;

export { PRCommentType, PR_COMMENT_TYPES };
