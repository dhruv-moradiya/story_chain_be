module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type must be one of the following
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only
        'style', // Code style (formatting, semicolons, etc)
        'refactor', // Code refactoring
        'perf', // Performance improvement
        'test', // Adding or updating tests
        'build', // Build system or dependencies
        'ci', // CI/CD configuration
        'chore', // Other changes (maintenance)
        'revert', // Revert a previous commit
      ],
    ],
    // Type must be lowercase
    'type-case': [2, 'always', 'lower-case'],
    // Type cannot be empty
    'type-empty': [2, 'never'],
    // Subject cannot be empty
    'subject-empty': [2, 'never'],
    // Subject must not end with period
    'subject-full-stop': [2, 'never', '.'],
    // Subject max length
    'subject-max-length': [2, 'always', 72],
    // Header max length
    'header-max-length': [2, 'always', 100],
  },
};
