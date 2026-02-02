# OverviewSection Data Analysis Report

This report defines the data currently consumed from the API and the data that is currently static (hardcoded) in the `OverviewSection` component but requires API integration.

## 1. Current Data from API (Integrated)

The component currently fetches data using the `useGetStoryOverviewBySlug` hook, which maps to `IGetStoryOverviewBySlugResponse`.

### Story Details

- **Title**: `story.title`
- **Slug**: `story.slug`
- **Description**: `story.description`
- **Status**: `story.status` (e.g., ONGOING, COMPLETED)
- **Genres**: `story.genres`
- **Content Rating**: `story.contentRating`
- **Cover Image**: `story.coverImage.url`
- **Last Update**: `story.lastActivityAt`

### Collaborators

- **Owner**: Filtered from `story.collaborators` (Role: OWNER)
- **Contributors**: Filtered from `story.collaborators` (Role: !OWNER)

### Statistics (Available in `story.stats`)

- **Total Chapters**: `story.stats.totalChapters`
- **Total Reads**: `story.stats.totalReads` (Used as `inlineStats.totalReads` mock currently, but available)
- **Total Votes**: `story.stats.totalVotes` (Used as `inlineStats.totalVotes` mock currently, but available)
- **Total Contributors**: `story.stats.uniqueContributors` (Used as `inlineStats.totalContributors` mock currently, but available)
- **Average Rating**: `story.stats.averageRating` (Used as `inlineStats.rating` mock currently, but available)

---

## 2. Requirements from API (Currently Static/Missing)

The following data points are hardcoded or missing from the current `IGetStoryOverviewBySlugResponse` type and need to be added to the API response or fetched via a separate endpoint.

### A. Extended Statistics

These fields are currently hardcoded in `inlineStats`:

| Field               | Current Mock Value      | Requirement                                                                           |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| **Rating Count**    | `ratingVotes: 342`      | Need `totalRatingVotes` in `IStoryStats`.                                             |
| **Progress**        | `progressPercent: 80`   | Need calculated progress % (if applicable based on planned chapters) or manual field. |
| **Estimated Scope** | `estimatedChapters: 60` | Need `estimatedChapters` field in `IStory` or `IStorySettings`.                       |
| **Start Date**      | `startedAt: 'Jan 2024'` | _Available as `story.createdAt`, just need to use it instead of mock._                |

### B. Latest Chapters Preview

The component displays a list of recent chapters, which is currently a static array `latestChapters`.

**Missing Data:**

- A list of the most recent N chapters (e.g., top 2-3).

**Proposed Structure (e.g., `latestChapters` field in Overview response):**

```typescript
interface ILatestChapterPreview {
  _id: string;
  slug: string; // or construct from number + basic slug
  title: string;
  excerpt?: string;

  // Stats
  readCount: number;
  commentCount: number;
  likeCount: number; // or voteCount

  // Meta
  createdAt: Date; // For "2 days ago"

  // Author Info
  author: {
    username: string;
    role: string; // e.g. "Moderator", "Owner"
    avatarUrl?: string; // or calculate from email/clerk mapping
  };
}
```

### C. Chapter Progression Logic

- **"Continue Reading"**: The component currently mocks `onContinueReading` to a static chapter (`/chapter/23`).
  - **Requirement**: Need user-specific progress data (e.g., "last read chapter ID" for the current user) to properly link this button.
- **"Start Reading"**: Mocks to `/chapter/1`. This is likely safe to assume always exists/is valid, but fetching the first chapter's slug/ID is safer.

## Recommendations

1.  **Update `IStoryStats`**: Add `totalRatings` (count).
2.  **Update `IStory` / `IStorySettings`**: Add `estimatedChapters` target.
3.  **Update `IGetStoryOverviewBySlugResponse`**: Include a `latestChapters` array (top 2).
4.  **User Progress**: A separate call or field `userProgress` (if authenticated) to get the "Continue Reading" chapter.
