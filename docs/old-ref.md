# Story and Chapter References in Models

This document lists all Mongoose models where `chapterId` and `storyId` are used as references to `Story` and `Chapter` docs.

## `chapterId` References

The following models use `chapterId` (or similar fields) with `ref: 'Chapter'`:

### 1. ChapterAutoSave

- File: `src/models/chapterAutoSave.modal.ts`
- Field: `chapterId`

```typescript
chapterId: {
  type: Schema.Types.ObjectId,
  ref: 'Chapter',
},
```

### 2. ReadingHistory

- File: `src/models/readingHistory.model.ts`
- Field: `currentChapterId`
- Field: `chaptersRead.chapterId` (in array)

```typescript
currentChapterId: {
  type: Schema.Types.ObjectId,
  ref: 'Chapter',
  required: true,
},
// ...
chaptersRead: [
  {
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },
    readAt: { type: Date, default: Date.now },
  },
],
```

### 3. Bookmark

- File: `src/models/bookmark.model.ts`
- Field: `chapterId`

```typescript
chapterId: {
  type: Schema.Types.ObjectId,
  ref: 'Chapter',
},
```

### 4. PullRequest

- File: `src/models/pullRequest.model.ts`
- Field: `chapterId`
- Field: `parentChapterId`

```typescript
chapterId: {
  type: Schema.Types.ObjectId,
  ref: 'Chapter',
  required: true,
  index: true,
},
// ...
parentChapterId: {
  type: Schema.Types.ObjectId,
  ref: 'Chapter',
  required: true,
  index: true,
},
```

### 5. Comment

- File: `src/models/comment.model.ts`
- Field: `chapterId`

```typescript
chapterId: {
  type: Schema.Types.ObjectId,
  ref: 'Chapter',
  required: true,
  index: true,
},
```

### 6. ChapterVersion

- File: `src/models/chapterVersion.model.ts`
- Field: `chapterId`

```typescript
chapterId: {
  type: Schema.Types.ObjectId,
  ref: 'Chapter',
  required: true,
  index: true,
},
```

### 7. Report

- File: `src/models/report.model.ts`
- Field: `relatedChapterId`

```typescript
relatedChapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },
```

### 8. Notification

- File: `src/models/notification.model.ts`
- Field: `relatedChapterId`

```typescript
relatedChapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },
```

### 9. Vote

- File: `src/models/vote.model.ts`
- Field: `chapterId`

```typescript
chapterId: {
  type: Schema.Types.ObjectId,
  ref: 'Chapter',
  required: true,
  index: true,
},
```

---

## `storyId` References

The following models use `storyId` (or similar fields) with `ref: 'Story'`:

### 1. ChapterAutoSave

- File: `src/models/chapterAutoSave.modal.ts`
- Field: `storyId`

```typescript
storyId: {
  type: Schema.Types.ObjectId,
  ref: 'Story',
  required: true,
  index: true,
},
```

### 2. ReadingHistory

- File: `src/models/readingHistory.model.ts`
- Field: `storyId`

```typescript
storyId: {
  type: Schema.Types.ObjectId,
  ref: 'Story',
  required: true,
  index: true,
},
```

### 3. Bookmark

- File: `src/models/bookmark.model.ts`
- Field: `storyId`

```typescript
storyId: {
  type: Schema.Types.ObjectId,
  ref: 'Story',
  required: true,
  index: true,
},
```

### 4. PullRequest

- File: `src/models/pullRequest.model.ts`
- Field: `storyId`

```typescript
storyId: {
  type: Schema.Types.ObjectId,
  ref: 'Story',
  required: true,
  index: true,
},
```

### 5. Report

- File: `src/models/report.model.ts`
- Field: `relatedStorySlug` (Note: Uses `ref: 'Story'` but type is `String`)

```typescript
relatedStorySlug: { type: String, ref: 'Story' },
```

### 6. Notification

- File: `src/models/notification.model.ts`
- Field: `relatedStorySlug` (Note: Uses `ref: 'Story'` but type is `String`)

```typescript
relatedStorySlug: { type: String, ref: 'Story' },
```
