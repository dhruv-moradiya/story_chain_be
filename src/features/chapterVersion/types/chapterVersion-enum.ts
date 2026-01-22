enum ChapterVersionEditType {
  MANUAL_EDIT = 'manual_edit',
  PR_MERGE = 'pr_merge',
  ADMIN_ROLLBACK = 'admin_rollback',
  MODERATION_REMOVAL = 'moderation_removal',
  IMPORT = 'import',
}

const CHAPTER_VERSION_EDIT_TYPES = [
  'manual_edit',
  'pr_merge',
  'admin_rollback',
  'moderation_removal',
  'import',
] as const;

export { ChapterVersionEditType, CHAPTER_VERSION_EDIT_TYPES };
