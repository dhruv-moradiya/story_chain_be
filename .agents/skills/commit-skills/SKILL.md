---
name: Commit Message Style
description: A guide for writing commit messages that follow the project's commitlint configuration.
---

# Commit Message Style Guide

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification with specific rules defined in `commitlint.config.cjs`.

## Format

```text
type(scope): subject
```

- **type**: Must be one of the allowed types (lowercase).
- **scope**: Optional. The section of the codebase being modified (e.g., `schema`, `auth`, `story`).
- **subject**: A short, imperative description of the change.
  - Max length: **72 characters**
  - No ending period `.`.
  - Use lowercase (imperative mood).

## Allowed Types

| Type       | Description                                                                                            |
| :--------- | :----------------------------------------------------------------------------------------------------- |
| `feat`     | A new feature                                                                                          |
| `fix`      | A bug fix                                                                                              |
| `docs`     | Documentation only changes                                                                             |
| `style`    | Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc) |
| `refactor` | A code change that neither fixes a bug nor adds a feature                                              |
| `perf`     | A code change that improves performance                                                                |
| `test`     | Adding missing tests or correcting existing tests                                                      |
| `build`    | Changes that affect the build system or external dependencies                                          |
| `ci`       | Changes to our CI configuration files and scripts                                                      |
| `chore`    | Other changes that don't modify src or test files                                                      |
| `revert`   | Reverts a previous commit                                                                              |

## Rules

1. **Header Max Length**: 100 characters.
2. **Subject Max Length**: 72 characters.
3. **No Period**: Subject must not end with a period.
4. **Lowercase**: Type must be lowercase.

## Examples

### Example 1: Feature

```text
feat(auth): add google oauth login support
```

### Example 2: Bug Fix

```text
fix(user): resolve race condition in webhook handler
```

### Example 3: Documentation

```text
docs: update readme with setup instructions
```

### Example 4: Chore

```text
chore: update dependencies
```

### Example 5: Style

```text
style: format code with prettier
```

### Example 6: Refactor (Requested Example)

```text
refactor(schema): organize request schemas into request folder
```
