import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { ReadingHistory } from '../src/models/readingHistory.model';
import { Story } from '../src/models/story.model';
import { Chapter } from '../src/models/chapter.model';
import { User } from '../src/models/user.model';
import { env } from '../src/config/env';

interface ChapterReadEntry {
  chapterSlug: string;
  totalReadTime: number;
  lastHeartbeatAt: Date;
  activeSessionId: string | null;
  hasQualifiedRead: boolean;
}

export interface ReadingHistorySeedOptions {
  /** Target number of reading histories per chapter. Default: 200 (or parsed from CLI --total_feed) */
  totalFeed?: number;

  /** Max number of stories to seed history for. Default: all published */
  storyLimit?: number;

  /** Wipe all ReadingHistory docs first. Default: false */
  clearExisting?: boolean;
}

// ─── CLI Argument Parser ──────────────────────────────────────────────────────

/**
 * Parse --total_feed or --total-feed from process.argv or environment variables.
 * Supported formats:
 *   --total_feed=200
 *   --total_feed 200
 *   --total_feed = 200
 *   --total-feed=200
 *   --total-feed 200
 *   SEED_TOTAL_FEED=200
 */
export function parseTotalFeedArg(defaultVal: number = 200): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Format: --total_feed=200 or --total-feed=200
    if (arg.startsWith('--total_feed=') || arg.startsWith('--total-feed=')) {
      const parts = arg.split('=');
      const valStr = parts[1]?.trim();
      if (valStr) {
        const val = parseInt(valStr, 10);
        if (!isNaN(val) && val > 0) return val;
      }
    }

    // Format: --total_feed or --total-feed followed by 200 or = 200
    if (arg === '--total_feed' || arg === '--total-feed') {
      if (i + 1 < args.length) {
        if (args[i + 1] === '=') {
          if (i + 2 < args.length) {
            const val = parseInt(args[i + 2], 10);
            if (!isNaN(val) && val > 0) return val;
          }
        } else {
          const val = parseInt(args[i + 1], 10);
          if (!isNaN(val) && val > 0) return val;
        }
      }
    }
  }

  if (process.env.SEED_TOTAL_FEED) {
    const val = parseInt(process.env.SEED_TOTAL_FEED, 10);
    if (!isNaN(val) && val > 0) return val;
  }

  if (process.env.TOTAL_FEED) {
    const val = parseInt(process.env.TOTAL_FEED, 10);
    if (!isNaN(val) && val > 0) return val;
  }

  return defaultVal;
}

export function parseClearExistingArg(): boolean {
  const args = process.argv.slice(2);
  return args.some(
    (arg) => arg === '--clear' || arg === '--clear-existing' || arg === '--clearExisting'
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a realistic per-chapter read time in seconds (60s – 480s / 1 to 8 minutes). */
function fakeReadTime(): number {
  return faker.number.int({ min: 60, max: 480 });
}

// ─── Core Seeder ─────────────────────────────────────────────────────────────

export async function seedReadingHistories(options: ReadingHistorySeedOptions = {}) {
  const totalFeed = options.totalFeed ?? parseTotalFeedArg(200);
  const clearExisting = options.clearExisting ?? parseClearExistingArg();
  const { storyLimit } = options;

  if (clearExisting) {
    await ReadingHistory.deleteMany({});
    console.log('[ReadingHistorySeeder] 🧹 Cleared existing reading histories.');
  }

  // 1. Fetch stories + users
  const storyQuery = Story.find({ status: 'published' });
  if (storyLimit) storyQuery.limit(storyLimit);

  const [stories, users] = await Promise.all([
    storyQuery.select('slug title').lean(),
    User.find({ isBanned: false }).select('clerkId').lean(),
  ]);

  if (!stories.length) {
    console.warn('[ReadingHistorySeeder] ⚠️ No published stories found — skipping.');
    return { totalInserted: 0, totalSkippedStories: 0, processedChapters: 0 };
  }

  const userIds = users.map((u) => u.clerkId);

  // 2. Fetch all published chapters for these stories
  const storySlugs = stories.map((s) => s.slug);
  const chapters = await Chapter.find({
    storySlug: { $in: storySlugs },
    status: 'published',
  })
    .select('slug storySlug parentChapterSlug ancestorSlugs isEnding')
    .lean();

  if (!chapters.length) {
    console.warn('[ReadingHistorySeeder] ⚠️ No published chapters found — skipping.');
    return { totalInserted: 0, totalSkippedStories: stories.length, processedChapters: 0 };
  }

  // Group chapters by storySlug
  const chaptersByStory = new Map<string, typeof chapters>();
  for (const ch of chapters) {
    if (!chaptersByStory.has(ch.storySlug)) {
      chaptersByStory.set(ch.storySlug, []);
    }
    chaptersByStory.get(ch.storySlug)!.push(ch);
  }

  console.log(
    `[ReadingHistorySeeder] 🚀 Seeding ${totalFeed} reading histories for each chapter across ${stories.length} stories (${chapters.length} chapters total)...`
  );

  const BATCH_SIZE = 500;
  let totalInserted = 0;
  let totalSkippedStories = 0;
  let processedChapters = 0;
  const batch: object[] = [];

  let synthUserCounter = 1;

  for (const story of stories) {
    const storyChapters = chaptersByStory.get(story.slug) ?? [];
    if (!storyChapters.length) {
      totalSkippedStories++;
      continue;
    }

    // Keep track of used userIds for this story to enforce unique (userId, storySlug)
    const usedUsersForStory = new Set<string>();

    if (!clearExisting) {
      const existingHistories = await ReadingHistory.find({ storySlug: story.slug })
        .select('userId')
        .lean();
      for (const h of existingHistories) {
        usedUsersForStory.add(h.userId);
      }
    }

    for (const ch of storyChapters) {
      processedChapters++;

      // Ordered chapter slugs from root down to current chapter
      const ancestorList = Array.isArray(ch.ancestorSlugs) ? ch.ancestorSlugs : [];
      const pathSlugs = [...ancestorList, ch.slug];

      for (let i = 0; i < totalFeed; i++) {
        // Pick a unique user ID for this story doc
        let userId: string | null = null;

        if (userIds.length > 0) {
          const availableUsers = userIds.filter((id) => !usedUsersForStory.has(id));
          if (availableUsers.length > 0) {
            userId = faker.helpers.arrayElement(availableUsers);
          }
        }

        if (!userId) {
          const slugPrefix = story.slug.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '');
          userId = `user_rh_seed_${slugPrefix}_${synthUserCounter++}_${faker.string.alphanumeric(6)}`;
        }

        usedUsersForStory.add(userId);

        // Build chaptersRead entries for path from root down to ch
        const sessionStart = faker.date.past({ years: 1 });
        let cursor = new Date(sessionStart);
        let totalReadTime = 0;
        const endingChapters: string[] = [];

        const chaptersReadEntries: ChapterReadEntry[] = pathSlugs.map((chapterSlug) => {
          const readTime = fakeReadTime();
          totalReadTime += readTime;
          const heartbeat = new Date(cursor.getTime() + readTime * 1000);
          cursor = heartbeat;
          const hasQualifiedRead = readTime >= 60;

          if (chapterSlug === ch.slug && ch.isEnding && hasQualifiedRead) {
            endingChapters.push(chapterSlug);
          }

          return {
            chapterSlug,
            totalReadTime: readTime,
            lastHeartbeatAt: heartbeat,
            activeSessionId: null,
            hasQualifiedRead,
          };
        });

        const lastHeartbeat =
          chaptersReadEntries[chaptersReadEntries.length - 1]?.lastHeartbeatAt ?? new Date();

        batch.push({
          userId,
          storySlug: story.slug,
          currentChapterSlug: ch.slug,
          chaptersRead: chaptersReadEntries,
          lastReadAt: lastHeartbeat,
          totalStoryReadTime: totalReadTime,
          completedEndingChapters: endingChapters,
          completedPaths: endingChapters.length,
        });

        totalInserted++;

        if (batch.length >= BATCH_SIZE) {
          await ReadingHistory.insertMany(batch, { ordered: false });
          batch.length = 0;
        }
      }
    }

    if (batch.length > 0) {
      await ReadingHistory.insertMany(batch, { ordered: false });
      batch.length = 0;
    }

    // Query all reading history documents for this story to aggregate complete chapter & story stats
    const allStoryHistories = await ReadingHistory.find({ storySlug: story.slug }).lean();

    const aggregateChapterStats = new Map<
      string,
      {
        reads: number;
        uniqueUsers: Set<string>;
        totalReadTime: number;
        completions: number;
        dropOffs: number;
      }
    >();

    for (const ch of storyChapters) {
      aggregateChapterStats.set(ch.slug, {
        reads: 0,
        uniqueUsers: new Set<string>(),
        totalReadTime: 0,
        completions: 0,
        dropOffs: 0,
      });
    }

    for (const rh of allStoryHistories) {
      for (const entry of rh.chaptersRead) {
        const cStats = aggregateChapterStats.get(entry.chapterSlug);
        if (cStats) {
          cStats.reads += 1;
          cStats.uniqueUsers.add(rh.userId);
          cStats.totalReadTime += entry.totalReadTime;
          if (entry.hasQualifiedRead) {
            cStats.completions += 1;
          }
        }
      }
      const targetCStats = aggregateChapterStats.get(rh.currentChapterSlug);
      if (targetCStats) {
        targetCStats.dropOffs += 1;
      }
    }

    // Update chapter statistics in DB for this story
    const chapterBulkOps = [];
    let storyTotalReads = 0;

    for (const [slug, stats] of aggregateChapterStats.entries()) {
      storyTotalReads += stats.reads;
      const reads = stats.reads;
      const uniqueReaders = stats.uniqueUsers.size;
      const totalReadTime = stats.totalReadTime;
      const avgReadTime = reads > 0 ? Math.round(totalReadTime / reads) : 0;
      const completions = stats.completions;
      const dropOffs = stats.dropOffs;
      const completionRate = reads > 0 ? Math.round((completions / reads) * 100) : 0;
      const engagementScore = Math.min(
        100,
        Math.round(completionRate * 0.7 + Math.min(avgReadTime / 3, 100) * 0.3)
      );

      chapterBulkOps.push({
        updateOne: {
          filter: { slug },
          update: {
            $set: {
              'stats.reads': reads,
              'stats.uniqueReaders': uniqueReaders,
              'stats.totalReadTime': totalReadTime,
              'stats.avgReadTime': avgReadTime,
              'stats.completions': completions,
              'stats.dropOffs': dropOffs,
              'stats.completionRate': completionRate,
              'stats.engagementScore': engagementScore,
            },
          },
        },
      });
    }

    if (chapterBulkOps.length > 0) {
      await Chapter.bulkWrite(chapterBulkOps);
    }

    // Update story statistics in DB
    await Story.updateOne(
      { slug: story.slug },
      { $set: { 'stats.totalReads': storyTotalReads } }
    );
  }

  return { totalInserted, totalSkippedStories, processedChapters };
}

export async function runReadingHistorySeeder(options: ReadingHistorySeedOptions = {}) {
  const { totalInserted, totalSkippedStories, processedChapters } = await seedReadingHistories(
    options
  );
  console.log(
    `[ReadingHistorySeeder] ✅ Successfully inserted ${totalInserted} reading histories & updated chapter/story stats across ${processedChapters} chapters` +
      (totalSkippedStories ? ` (${totalSkippedStories} stories skipped — no chapters).` : '.')
  );
}

if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(env.MONGODB_URI);
      console.log('[ReadingHistorySeeder] Connected to MongoDB.');
      await runReadingHistorySeeder();
      await mongoose.disconnect();
      console.log('[ReadingHistorySeeder] Finished and disconnected.');
    } catch (err) {
      console.error('[ReadingHistorySeeder] Error during seeding:', err);
      process.exit(1);
    }
  })();
}
