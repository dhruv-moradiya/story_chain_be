import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { User } from '../src/models/user.model';
import { CommentVote } from '../src/models/commentVote.model';
import { Comment } from '../src/models/comment.model';
// ─── Types ────────────────────────────────────────────────────────────────────

type VoteType = 'upvote' | 'downvote';

interface VoteTally {
  upvotes: number;
  downvotes: number;
}

interface CommentVoteSeedOptions {
  /** Seed votes only for comments seeded in the current run (pass their IDs).
   *  If omitted, fetches all non-deleted comments from the DB. */
  commentIds?: mongoose.Types.ObjectId[];

  /** Max % of the user pool that votes on any single comment (0–1). Default: 0.4 */
  voterParticipationRate?: number;

  /** Probability a vote is an upvote vs downvote (0–1). Default: 0.75 */
  upvoteBias?: number;

  /** Wipe all CommentVote docs and reset comment vote counters first. Default: false */
  clearExisting?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pick a random subset of `arr` with size between min and max (inclusive). */
function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const size = faker.number.int({ min, max: Math.min(max, arr.length) });
  return faker.helpers.arrayElements(arr, size);
}

/** Build vote docs for a single comment, ensuring no duplicate userId per commentId. */
function buildVotesForComment(
  commentId: mongoose.Types.ObjectId,
  voters: string[],
  upvoteBias: number
): { docs: object[]; tally: VoteTally } {
  const tally: VoteTally = { upvotes: 0, downvotes: 0 };

  const docs = voters.map((userId) => {
    const voteType: VoteType = faker.datatype.boolean({ probability: upvoteBias })
      ? 'upvote'
      : 'downvote';

    if (voteType === 'upvote') tally.upvotes++;
    else tally.downvotes++;

    return {
      commentId,
      userId,
      voteType,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
    };
  });

  return { docs, tally };
}

// ─── Core Seeder ─────────────────────────────────────────────────────────────

export async function seedCommentVotes(options: CommentVoteSeedOptions = {}) {
  const {
    commentIds,
    voterParticipationRate = 0.4,
    upvoteBias = 0.75,
    clearExisting = false,
  } = options;

  // ── 1. Wipe existing data if requested ──────────────────────────────────────
  if (clearExisting) {
    await CommentVote.deleteMany({});

    // Reset all comment vote counters to zero
    await Comment.updateMany({}, { $set: { 'votes.upvotes': 0, 'votes.downvotes': 0 } });
    console.log('[CommentVoteSeeder] Cleared existing votes and reset comment counters.');
  }

  // ── 2. Resolve which comments to seed ───────────────────────────────────────
  const commentQuery = commentIds?.length
    ? Comment.find({ _id: { $in: commentIds }, isDeleted: false })
    : Comment.find({ isDeleted: false });

  const [comments, users] = await Promise.all([
    commentQuery.select('_id').lean(),
    User.find({ isBanned: false }).select('clerkId').lean(),
  ]);

  if (!comments.length || !users.length) {
    console.warn('[CommentVoteSeeder] No comments or users found — skipping.');
    return { totalVotes: 0, commentsProcessed: 0 };
  }

  const userIds = users.map((u) => u.clerkId);
  const maxVoters = Math.max(1, Math.floor(userIds.length * voterParticipationRate));

  console.log(
    `[CommentVoteSeeder] Seeding votes for ${comments.length} comments` +
      ` across ${userIds.length} users (up to ${maxVoters} voters/comment)...`
  );

  // ── 3. Build and insert votes in batches ────────────────────────────────────
  const BATCH_SIZE = 200;
  let totalVotes = 0;

  // Accumulate bulk writes for syncing comment vote counters
  const commentCounterUpdates: mongoose.mongo.AnyBulkWriteOperation[] = [];
  const voteBatch: object[] = [];

  for (const comment of comments) {
    const commentId = comment._id as mongoose.Types.ObjectId;

    // Random subset of users who voted on this comment
    const voters = randomSubset(userIds, 0, maxVoters);
    if (!voters.length) continue;

    const { docs, tally } = buildVotesForComment(commentId, voters, upvoteBias);

    voteBatch.push(...docs);
    totalVotes += docs.length;

    // Queue a counter sync for this comment
    commentCounterUpdates.push({
      updateOne: {
        filter: { _id: commentId },
        update: {
          $inc: {
            'votes.upvotes': tally.upvotes,
            'votes.downvotes': tally.downvotes,
          },
        },
      },
    });

    // Flush vote batch when it hits BATCH_SIZE
    if (voteBatch.length >= BATCH_SIZE) {
      await CommentVote.insertMany(voteBatch, { ordered: false });
      voteBatch.length = 0;
    }
  }

  // Flush remaining votes
  if (voteBatch.length) {
    await CommentVote.insertMany(voteBatch, { ordered: false });
  }

  // ── 4. Sync upvote/downvote counters back onto Comment docs ─────────────────
  if (commentCounterUpdates.length) {
    await Comment.bulkWrite(commentCounterUpdates, { ordered: false });
    console.log(
      `[CommentVoteSeeder] Synced vote counters on ${commentCounterUpdates.length} comments.`
    );
  }

  return { totalVotes, commentsProcessed: comments.length };
}

// ─── Entry point (standalone run) ────────────────────────────────────────────

export async function runCommentVoteSeeder(options: CommentVoteSeedOptions = {}) {
  const { totalVotes, commentsProcessed } = await seedCommentVotes(options);
  console.log(
    `[CommentVoteSeeder] ✅ Inserted ${totalVotes} votes across ${commentsProcessed} comments.`
  );
}
