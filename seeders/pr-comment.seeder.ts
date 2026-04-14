import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { PRComment } from '../src/models/prComment.model';
import { PullRequest } from '../src/models/pullRequest.model';
import { User } from '../src/models/user.model';
import type { SeededPullRequest } from './pull-request.seeder';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PRCommentSeedOptions {
  /** Pass IDs from a fresh PR seeder run, or omit to fetch all PRs from DB */
  pullRequests?: SeededPullRequest[];
  /** Top-level comments per PR. Default: { min: 1, max: 8 } */
  commentsPerPR?: { min: number; max: number };
  /** Max reply depth (1 = direct replies only, 2 = replies to replies). Default: 2 */
  replyDepth?: number;
  /** Replies per top-level comment. Default: { min: 0, max: 4 } */
  repliesPerComment?: { min: number; max: number };
  /** Wipe all PRComment docs and reset commentCount first. Default: false */
  clearExisting?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCommentContent(): string {
  const styles = [
    () => faker.lorem.sentences({ min: 1, max: 3 }),
    () => `${faker.word.interjection()}! ${faker.lorem.sentence()}`,
    () => faker.lorem.paragraph({ min: 1, max: 2 }),
    () => faker.lorem.sentence(),
  ];
  return faker.helpers.arrayElement(styles)();
}

function buildDoc(
  pullRequestId: mongoose.Types.ObjectId,
  storySlug: string,
  userId: string,
  parentCommentId: mongoose.Types.ObjectId | null,
  createdAt: Date
) {
  const isEdited = faker.datatype.boolean({ probability: 0.1 });
  return {
    pullRequestId,
    storySlug,
    userId,
    parentCommentId,
    content: buildCommentContent(),
    isEdited,
    editedAt: isEdited ? faker.date.between({ from: createdAt, to: new Date() }) : undefined,
    createdAt,
    updatedAt: new Date(),
  };
}

// ─── Core Seeder ─────────────────────────────────────────────────────────────

export async function seedPRComments(options: PRCommentSeedOptions = {}) {
  const {
    pullRequests,
    commentsPerPR = { min: 1, max: 8 },
    replyDepth = 2,
    repliesPerComment = { min: 0, max: 4 },
    clearExisting = false,
  } = options;

  if (clearExisting) {
    await PRComment.deleteMany({});
    await PullRequest.updateMany({}, { $set: { commentCount: 0 } });
    console.log('[PRCommentSeeder] Cleared PRComment docs and reset commentCount.');
  }

  // ── 1. Resolve PRs and users ─────────────────────────────────────────────
  const [prs, users] = await Promise.all([
    pullRequests
      ? Promise.resolve(pullRequests)
      : PullRequest.find({})
          .select('_id storySlug')
          .lean()
          .then((docs) =>
            docs.map((d) => ({
              _id: d._id as mongoose.Types.ObjectId,
              storySlug: d.storySlug,
              status: d.status as string,
            }))
          ),
    User.find({ isBanned: false }).select('clerkId').lean(),
  ]);

  if (!prs.length || !users.length) {
    console.warn('[PRCommentSeeder] No PRs or users — skipping.');
    return 0;
  }

  const userIds = users.map((u) => u.clerkId);
  let totalComments = 0;

  // Track comment count per PR for sync
  const commentCountMap = new Map<string, number>();

  // ── 2. Build comments per PR ─────────────────────────────────────────────
  for (const pr of prs) {
    const prIdStr = pr._id.toString();
    const topLevelCount = faker.number.int(commentsPerPR);
    let prCommentCount = 0;

    // ── Top-level comments ────────────────────────────────────────────────
    const topLevelDocs = Array.from({ length: topLevelCount }, () =>
      buildDoc(
        pr._id,
        pr.storySlug,
        faker.helpers.arrayElement(userIds),
        null,
        faker.date.past({ years: 1 })
      )
    );

    const inserted = await PRComment.insertMany(topLevelDocs, { ordered: false });
    prCommentCount += inserted.length;

    // ── Depth-1 replies ───────────────────────────────────────────────────
    for (const parent of inserted) {
      const replyCount = faker.number.int(repliesPerComment);
      if (!replyCount) continue;

      const depth1Docs = Array.from({ length: replyCount }, () =>
        buildDoc(
          pr._id,
          pr.storySlug,
          faker.helpers.arrayElement(userIds),
          parent._id as mongoose.Types.ObjectId,
          faker.date.between({ from: parent.createdAt as Date, to: new Date() })
        )
      );

      const insertedReplies = await PRComment.insertMany(depth1Docs, { ordered: false });
      prCommentCount += insertedReplies.length;

      // ── Depth-2 replies (replies to replies) ──────────────────────────
      if (replyDepth >= 2) {
        for (const reply of insertedReplies) {
          if (!faker.datatype.boolean({ probability: 0.35 })) continue;

          const subCount = faker.number.int({ min: 1, max: 2 });
          const subDocs = Array.from({ length: subCount }, () =>
            buildDoc(
              pr._id,
              pr.storySlug,
              faker.helpers.arrayElement(userIds),
              reply._id as mongoose.Types.ObjectId,
              faker.date.between({ from: reply.createdAt as Date, to: new Date() })
            )
          );

          const insertedSubs = await PRComment.insertMany(subDocs, { ordered: false });
          prCommentCount += insertedSubs.length;
        }
      }
    }

    totalComments += prCommentCount;
    commentCountMap.set(prIdStr, prCommentCount);
  }

  // ── 3. Sync commentCount back onto PR ────────────────────────────────────
  const prBulkWrites: any[] = [];

  for (const [prIdStr, count] of Array.from(commentCountMap.entries())) {
    prBulkWrites.push({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(prIdStr) },
        update: { $set: { commentCount: count } },
      },
    });
  }

  if (prBulkWrites.length) {
    await PullRequest.bulkWrite(prBulkWrites, { ordered: false });
    console.log(`[PRCommentSeeder] Synced commentCount on ${prBulkWrites.length} PRs.`);
  }

  return totalComments;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runPRCommentSeeder(options: PRCommentSeedOptions = {}) {
  const total = await seedPRComments(options);
  console.log(`[PRCommentSeeder] ✅ Inserted ${total} PR comments.`);
}
