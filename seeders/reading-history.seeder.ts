import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { ReadingHistory } from '../src/models/readingHistory.model';
import { Story } from '../src/models/story.model';
import { Chapter } from '../src/models/chapter.model';
import { User } from '../src/models/user.model';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChapterReadEntry {
  chapterSlug: string;
  totalReadTime: number;
  lastHeartbeatAt: Date;
  activeSessionId: string | null;
  hasQualifiedRead: boolean;
}

interface StoryChapterMap {
  storySlug: string;
  chapters: { slug: string; isEnding: boolean }[];
}

interface ReadingHistorySeedOptions {
  /** Max number of stories to seed history for. Default: all published */
  storyLimit?: number;

  /** Fraction of the user pool that reads any given story (0–1). Default: 0.3 */
  readerParticipationRate?: number;

  /** How many chapters of a story a user typically reads before stopping (0–1 as fraction of total). Default: 0.6 */
  chapterCompletionRate?: number;

  /** Wipe all ReadingHistory docs first. Default: false */
  clearExisting?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a realistic per-chapter read time in seconds (30s – 12min). */
function fakeReadTime(): number {
  return faker.number.int({ min: 30, max: 720 });
}

/**
 * Simulate a user's reading path through a story's chapters.
 * Returns an ordered subset that respects tree depth — a user can only
 * read a chapter after reading its parent.
 */
function buildReadPath(
  chapters: { slug: string; isEnding: boolean; parentChapterSlug: string | null }[],
  completionRate: number
): { slug: string; isEnding: boolean }[] {
  if (!chapters.length) return [];

  // Build a parent → children map for tree traversal
  const childMap = new Map<string | null, string[]>();
  for (const ch of chapters) {
    const parent = ch.parentChapterSlug ?? null;
    if (!childMap.has(parent)) childMap.set(parent, []);
    childMap.get(parent)!.push(ch.slug);
  }

  const chapterBySlug = new Map(chapters.map((c) => [c.slug, c]));
  const maxChapters = Math.max(1, Math.ceil(chapters.length * completionRate));

  // Walk the tree depth-first, randomly picking one branch at each fork
  const path: { slug: string; isEnding: boolean }[] = [];
  let currentSlug: string | null = null; // null = look for roots

  while (path.length < maxChapters) {
    const children = childMap.get(currentSlug) ?? [];
    if (!children.length) break;

    // Pick one random child branch
    const nextSlug = faker.helpers.arrayElement(children);
    const chapter = chapterBySlug.get(nextSlug)!;
    path.push({ slug: chapter.slug, isEnding: chapter.isEnding });
    currentSlug = nextSlug;
  }

  return path;
}

/** Build the chaptersRead subdoc array from a read path. */
function buildChaptersRead(
  path: { slug: string; isEnding: boolean }[],
  sessionStart: Date
): { entries: ChapterReadEntry[]; totalReadTime: number; endingChapters: string[] } {
  let cursor = new Date(sessionStart);
  let totalReadTime = 0;
  const endingChapters: string[] = [];

  const entries: ChapterReadEntry[] = path.map(({ slug, isEnding }) => {
    const readTime = fakeReadTime();
    totalReadTime += readTime;

    const heartbeat = new Date(cursor.getTime() + readTime * 1000);
    cursor = heartbeat;

    // Qualified read = user spent at least 60s on the chapter
    const hasQualifiedRead = readTime >= 60;

    if (isEnding && hasQualifiedRead) endingChapters.push(slug);

    return {
      chapterSlug: slug,
      totalReadTime: readTime,
      lastHeartbeatAt: heartbeat,
      activeSessionId: null, // no active session in seeded data
      hasQualifiedRead,
    };
  });

  return { entries, totalReadTime, endingChapters };
}

// ─── Core Seeder ─────────────────────────────────────────────────────────────

export async function seedReadingHistories(options: ReadingHistorySeedOptions = {}) {
  const {
    storyLimit,
    readerParticipationRate = 0.3,
    chapterCompletionRate = 0.6,
    clearExisting = false,
  } = options;

  if (clearExisting) {
    await ReadingHistory.deleteMany({});
    console.log('[ReadingHistorySeeder] Cleared existing reading histories.');
  }

  // ── 1. Fetch stories + their published chapters ───────────────────────────
  const storyQuery = Story.find({ status: 'published' });
  if (storyLimit) storyQuery.limit(storyLimit);

  const [stories, users] = await Promise.all([
    storyQuery.select('slug').lean(),
    User.find({ isBanned: false }).select('clerkId').lean(),
  ]);

  if (!stories.length || !users.length) {
    console.warn('[ReadingHistorySeeder] No stories or users found — skipping.');
    return { totalInserted: 0, totalSkipped: 0 };
  }

  // Fetch chapters grouped by story (only published chapters)
  const allChapters = await Chapter.find({
    storySlug: { $in: stories.map((s) => s.slug) },
    status: 'published',
  })
    .select('slug storySlug parentChapterSlug isEnding')
    .lean();

  // Group chapters by storySlug
  const chaptersByStory = new Map<
    string,
    StoryChapterMap['chapters'] & { parentChapterSlug: string | null }[]
  >();
  for (const ch of allChapters) {
    if (!chaptersByStory.has(ch.storySlug)) chaptersByStory.set(ch.storySlug, []);
    chaptersByStory.get(ch.storySlug)!.push({
      slug: ch.slug,
      isEnding: ch.isEnding ?? false,
      parentChapterSlug: ch.parentChapterSlug ?? null,
    });
  }

  const userIds = users.map((u) => u.clerkId);
  const maxReaders = Math.max(1, Math.floor(userIds.length * readerParticipationRate));

  console.log(
    `[ReadingHistorySeeder] Seeding for ${stories.length} stories` +
      ` × up to ${maxReaders} readers each...`
  );

  // ── 2. Build and upsert reading history docs ─────────────────────────────
  const BATCH_SIZE = 100;
  let totalInserted = 0;
  let totalSkipped = 0;
  const batch: object[] = [];

  for (const story of stories) {
    const chapters = chaptersByStory.get(story.slug) ?? [];
    if (!chapters.length) {
      totalSkipped++;
      continue;
    }

    // Random subset of readers for this story
    const readerCount = faker.number.int({ min: 1, max: maxReaders });
    const readers = faker.helpers.arrayElements(userIds, readerCount);

    for (const userId of readers) {
      const sessionStart = faker.date.past({ years: 1 });
      const readPath = buildReadPath(chapters, chapterCompletionRate);

      if (!readPath.length) continue;

      const { entries, totalReadTime, endingChapters } = buildChaptersRead(readPath, sessionStart);

      const lastChapter = readPath[readPath.length - 1];

      batch.push({
        userId,
        storySlug: story.slug,
        currentChapterSlug: lastChapter.slug,
        chaptersRead: entries,
        lastReadAt: entries[entries.length - 1].lastHeartbeatAt,
        totalStoryReadTime: totalReadTime,
        completedEndingChapters: endingChapters,
        completedPaths: endingChapters.length,
      });

      totalInserted++;
    }

    // Flush batch
    if (batch.length >= BATCH_SIZE) {
      await ReadingHistory.insertMany(batch, { ordered: false });
      batch.length = 0;
    }
  }

  // Flush remaining
  if (batch.length) {
    await ReadingHistory.insertMany(batch, { ordered: false });
  }

  return { totalInserted, totalSkipped };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runReadingHistorySeeder(options: ReadingHistorySeedOptions = {}) {
  const { totalInserted, totalSkipped } = await seedReadingHistories(options);
  console.log(
    `[ReadingHistorySeeder] ✅ Inserted ${totalInserted} reading histories` +
      (totalSkipped ? ` (${totalSkipped} stories skipped — no chapters).` : '.')
  );
}
