import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import type { SeededPullRequest } from './pull-request.seeder';
import { PRVote } from '../src/models/prVote.model';
import { PullRequest } from '../src/models/pullRequest.model';
import { PRTimeline } from '../src/models/prTimeline.model';
import { User } from '../src/models/user.model';
import { PRTimelineAction } from '../src/features/pullRequest/types/pullRequest-enum';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PRVoteSeedOptions {
  /** Pass IDs from a fresh PR seeder run, or omit to fetch all PRs from DB */
  pullRequests?: SeededPullRequest[];
  /** Fraction of users that vote on a given PR (0–1). Default: 0.35 */
  voterParticipationRate?: number;
  /** Probability a vote is an upvote (0–1). Default: 0.7 */
  upvoteBias?: number;
  /** Wipe all PRVote docs and reset PR vote counters first. Default: false */
  clearExisting?: boolean;
}

interface VoteTally {
  upvotes: number;
  downvotes: number;
  score: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const size = faker.number.int({ min, max: Math.min(max, arr.length) });
  return faker.helpers.arrayElements(arr, size);
}

// ─── Core Seeder ─────────────────────────────────────────────────────────────

export async function seedPRVotes(options: PRVoteSeedOptions = {}) {
  const {
    pullRequests,
    voterParticipationRate = 0.35,
    upvoteBias = 0.7,
    clearExisting = false,
  } = options;

  if (clearExisting) {
    await PRVote.deleteMany({});
    await PullRequest.updateMany(
      {},
      { $set: { 'votes.upvotes': 0, 'votes.downvotes': 0, 'votes.score': 0 } }
    );
    console.log('[PRVoteSeeder] Cleared PRVote docs and reset PR vote counters.');
  }

  // ── 1. Resolve PRs and users ─────────────────────────────────────────────
  const [prs, users] = await Promise.all([
    pullRequests
      ? Promise.resolve(pullRequests)
      : PullRequest.find({})
          .select('_id storySlug status')
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
    console.warn('[PRVoteSeeder] No PRs or users — skipping.');
    return 0;
  }

  const userIds = users.map((u) => u.clerkId);
  const maxVoters = Math.max(1, Math.floor(userIds.length * voterParticipationRate));

  // ── 2. Build vote docs ───────────────────────────────────────────────────
  const BATCH_SIZE = 300;
  const voteBatch: object[] = [];
  const timelineBatch: object[] = [];
  let totalVotes = 0;

  // Accumulate tally per PR for bulk sync
  const tallyMap = new Map<string, VoteTally>();

  for (const pr of prs) {
    const prIdStr = pr._id.toString();
    const voters = randomSubset(userIds, 0, maxVoters);
    if (!voters.length) continue;

    const tally: VoteTally = { upvotes: 0, downvotes: 0, score: 0 };
    tallyMap.set(prIdStr, tally);

    for (const userId of voters) {
      const isUpvote = faker.datatype.boolean({ probability: upvoteBias });
      const vote = isUpvote ? 1 : -1;
      const createdAt = faker.date.past({ years: 1 });

      voteBatch.push({
        pullRequestId: pr._id,
        storySlug: pr.storySlug,
        userId,
        vote,
        previousVote: null,
        changedAt: null,
        createdAt,
        updatedAt: new Date(),
      });

      // Timeline: only capture a sample of vote events (too many otherwise)
      if (faker.datatype.boolean({ probability: 0.2 })) {
        timelineBatch.push({
          pullRequestId: pr._id,
          storySlug: pr.storySlug,
          action: PRTimelineAction.VOTED,
          performedBy: userId,
          performedAt: createdAt,
          metadata: { vote },
        });
      }

      if (isUpvote) tally.upvotes++;
      else tally.downvotes++;
    }

    tally.score = tally.upvotes - tally.downvotes;
    totalVotes += voters.length;

    // Flush batch when it hits the limit
    if (voteBatch.length >= BATCH_SIZE) {
      await PRVote.insertMany(voteBatch, { ordered: false });
      voteBatch.length = 0;
    }
  }

  // Flush remaining
  if (voteBatch.length) {
    await PRVote.insertMany(voteBatch, { ordered: false });
  }

  if (timelineBatch.length) {
    await PRTimeline.insertMany(timelineBatch, { ordered: false });
  }

  // ── 3. Sync votes aggregate back onto PR ─────────────────────────────────
  const prBulkWrites: any[] = [];

  for (const [prIdStr, tally] of Array.from(tallyMap.entries())) {
    prBulkWrites.push({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(prIdStr) },
        update: {
          $set: {
            'votes.upvotes': tally.upvotes,
            'votes.downvotes': tally.downvotes,
            'votes.score': tally.score,
          },
        },
      },
    });
  }

  if (prBulkWrites.length) {
    await PullRequest.bulkWrite(prBulkWrites, { ordered: false });
    console.log(`[PRVoteSeeder] Synced vote counts on ${prBulkWrites.length} PRs.`);
  }

  return totalVotes;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runPRVoteSeeder(options: PRVoteSeedOptions = {}) {
  const total = await seedPRVotes(options);
  console.log(`[PRVoteSeeder] ✅ Inserted ${total} PR votes.`);
}
