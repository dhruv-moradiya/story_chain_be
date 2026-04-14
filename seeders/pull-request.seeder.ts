import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { Story } from '../src/models/story.model';
import { User } from '../src/models/user.model';
import { Chapter } from '../src/models/chapter.model';
import { PullRequest } from '../src/models/pullRequest.model';
import { PRTimeline } from '../src/models/prTimeline.model';

import {
  PR_LABELS,
  PR_STATUSES,
  PR_TYPES,
  PRStatus,
  PRType,
  PRTimelineAction,
} from '../src/features/pullRequest/types/pullRequest-enum';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SeededPullRequest {
  _id: mongoose.Types.ObjectId;
  storySlug: string;
  status: PRStatus;
}

export interface PullRequestSeedOptions {
  /** Max stories to create PRs for. Default: all published */
  storyLimit?: number;
  /** PRs to create per story. Default: { min: 2, max: 6 } */
  prsPerStory?: { min: number; max: number };
  /** Wipe all PullRequest + PRTimeline docs first. Default: false */
  clearExisting?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildApprovalsStatus(status: PRStatus) {
  const required = faker.number.int({ min: 1, max: 3 });

  if (status === 'open') {
    const received = faker.number.int({ min: 0, max: required - 1 });
    return {
      required,
      received,
      pending: required - received,
      approvers: [],
      blockers: [],
      canMerge: false,
    };
  }

  if (status === 'approved' || status === 'merged') {
    return {
      required,
      received: required,
      pending: 0,
      approvers: [],
      blockers: [],
      canMerge: true,
    };
  }

  return {
    required,
    received: 0,
    pending: required,
    approvers: [],
    blockers: [],
    canMerge: false,
  };
}

function buildTerminalDates(status: PRStatus, createdAt: Date) {
  const extra: Record<string, unknown> = {};

  if (status === 'merged') {
    extra.mergedAt = faker.date.between({ from: createdAt, to: new Date() });
  }
  if (status === 'closed') {
    extra.closedAt = faker.date.between({ from: createdAt, to: new Date() });
    extra.closeReason = faker.lorem.sentence();
  }

  return extra;
}

function buildContent(): { proposed: string; wordCount: number; readingMinutes: number } {
  const proposed = faker.lorem.paragraphs({ min: 3, max: 8 }, '\n\n');
  const wordCount = proposed.split(/\s+/).length;
  const readingMinutes = Math.ceil(wordCount / 200);
  return { proposed, wordCount, readingMinutes };
}

// ─── Core Seeder ─────────────────────────────────────────────────────────────

export async function seedPullRequests(
  options: PullRequestSeedOptions = {}
): Promise<SeededPullRequest[]> {
  const { storyLimit, prsPerStory = { min: 2, max: 6 }, clearExisting = false } = options;

  if (clearExisting) {
    await Promise.all([PullRequest.deleteMany({}), PRTimeline.deleteMany({})]);
    console.log('[PRSeeder] Cleared PullRequests and PRTimeline docs.');
  }

  // ── 1. Fetch data ────────────────────────────────────────────────────────
  const storyQuery = Story.find({ status: 'published' });
  if (storyLimit) storyQuery.limit(storyLimit);

  const [stories, users] = await Promise.all([
    storyQuery.select('slug').lean(),
    User.find({ isBanned: false }).select('clerkId').lean(),
  ]);

  if (!stories.length || !users.length) {
    console.warn('[PRSeeder] No stories or users — skipping.');
    return [];
  }

  const storySlugs = stories.map((s) => s.slug);
  const userIds = users.map((u) => u.clerkId);

  // Fetch published chapters grouped by story (need parent info for parentChapterSlug)
  const allChapters = await Chapter.find({
    storySlug: { $in: storySlugs },
    status: 'published',
  })
    .select('slug storySlug parentChapterSlug')
    .lean();

  const chaptersByStory = new Map<string, typeof allChapters>();
  for (const ch of allChapters) {
    if (!chaptersByStory.has(ch.storySlug)) chaptersByStory.set(ch.storySlug, []);
    chaptersByStory.get(ch.storySlug)!.push(ch);
  }

  // ── 2. Build PR docs ─────────────────────────────────────────────────────
  const prDocs: object[] = [];
  const timelineDocs: object[] = [];

  // We need IDs upfront so timeline can reference them — build them manually
  const seededPRs: SeededPullRequest[] = [];

  for (const story of stories) {
    const chapters = chaptersByStory.get(story.slug) ?? [];
    if (!chapters.length) continue;

    const count = faker.number.int(prsPerStory);

    for (let i = 0; i < count; i++) {
      const targetChapter = faker.helpers.arrayElement(chapters);
      const status = faker.helpers.weightedArrayElement([
        { value: 'open' as PRStatus, weight: 4 },
        { value: 'approved' as PRStatus, weight: 2 },
        { value: 'merged' as PRStatus, weight: 2 },
        { value: 'closed' as PRStatus, weight: 1 },
      ]);

      const authorId = faker.helpers.arrayElement(userIds);
      const prType = faker.helpers.arrayElement(PR_TYPES);
      const createdAt = faker.date.past({ years: 1 });
      const prId = new mongoose.Types.ObjectId();

      const labelCount = faker.number.int({ min: 0, max: 2 });
      const labels = faker.helpers.arrayElements(PR_LABELS, labelCount);

      const content = buildContent();
      const approvalsStatus = buildApprovalsStatus(status);
      const terminalDates = buildTerminalDates(status, createdAt);

      prDocs.push({
        _id: prId,
        title: faker.lorem.sentence({ min: 4, max: 10 }).replace(/\.$/, ''),
        description: faker.datatype.boolean({ probability: 0.7 }) ? faker.lorem.paragraph() : '',
        storySlug: story.slug,
        chapterSlug: targetChapter.slug,
        parentChapterSlug: targetChapter.parentChapterSlug ?? targetChapter.slug,
        authorId,
        prType,
        content,
        status,
        votes: { upvotes: 0, downvotes: 0, score: 0 },
        commentCount: 0,
        autoApprove: {
          enabled: faker.datatype.boolean({ probability: 0.2 }),
          threshold: faker.number.int({ min: 5, max: 20 }),
          timeWindow: faker.number.int({ min: 3, max: 14 }),
        },
        labels,
        isDraft: status === 'open' && faker.datatype.boolean({ probability: 0.1 }),
        approvalsStatus,
        stats: {
          views: faker.number.int({ min: 0, max: 500 }),
          discussions: 0,
          reviewsReceived: 0,
        },
        ...terminalDates,
        createdAt,
        updatedAt: new Date(),
      });

      // CREATED timeline event for this PR
      timelineDocs.push({
        pullRequestId: prId,
        storySlug: story.slug,
        action: PRTimelineAction.SUBMITTED,
        performedBy: authorId,
        performedAt: createdAt,
        metadata: { prType },
      });

      seededPRs.push({ _id: prId, storySlug: story.slug, status });
      console.log('seededPRs', seededPRs);
    }
  }

  // ── 3. Insert ────────────────────────────────────────────────────────────
  await Promise.all([
    PullRequest.insertMany(prDocs, { ordered: false }),
    PRTimeline.insertMany(timelineDocs, { ordered: false }),
  ]);

  return seededPRs;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runPullRequestSeeder(options: PullRequestSeedOptions = {}) {
  const seeded = await seedPullRequests(options);
  console.log(`[PRSeeder] ✅ Inserted ${seeded.length} pull requests.`);
  return seeded;
}
