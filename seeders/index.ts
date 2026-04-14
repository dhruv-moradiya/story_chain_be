import mongoose from 'mongoose';
import { runCommentSeeder } from './comment.seeder';
import { runCommentVoteSeeder } from './comment-vote.seeder';
import { runReadingHistorySeeder } from './reading-history.seeder';
import { seedPullRequests } from './pull-request.seeder';
import { runPRReviewSeeder, seedPRReviews } from './pr-review.seeder';
import { runPRVoteSeeder, seedPRVotes } from './pr-vote.seeder';
import { runPRCommentSeeder, seedPRComments } from './pr-comment.seeder';
import { env } from '../src/config/env';

// ─── Runners ──────────────────────────────────────────────────────────────────

async function seedCommentsOnly() {
  console.log('[Seeder] ── Seeding Comments ────────────────────────────────');
  await runCommentSeeder({ chapterLimit: 20, clearExisting: false });
}

async function seedVotesOnly() {
  console.log('[Seeder] ── Seeding CommentVotes ───────────────────────────');
  await runCommentVoteSeeder({
    voterParticipationRate: 0.6,
    upvoteBias: 0.75,
    clearExisting: false,
  });
}

async function seedReadingHistoryOnly() {
  console.log('[Seeder] ── Seeding ReadingHistory ─────────────────────────');
  await runReadingHistorySeeder({
    storyLimit: 20,
    readerParticipationRate: 0.3,
    chapterCompletionRate: 0.6,
    clearExisting: false,
  });
}

/**
 * Full PR pipeline — runs in dependency order:
 *   PullRequests → PRReviews → PRVotes → PRComments
 *
 * Each step passes the seeded PR list to the next so they don't re-query
 * the DB and are guaranteed to target only freshly created docs.
 */
async function seedPRsOnly() {
  console.log('[Seeder] ── Seeding PullRequests ───────────────────────────');
  const seededPRs = await seedPullRequests({
    storyLimit: 20,
    prsPerStory: { min: 2, max: 6 },
    clearExisting: false,
  });
  console.log(`[Seeder]    → ${seededPRs.length} PRs created.`);

  console.log('[Seeder] ── Seeding PRReviews ──────────────────────────────');
  await seedPRReviews({ pullRequests: seededPRs, reviewersPerPR: { min: 1, max: 3 } });

  console.log('[Seeder] ── Seeding PRVotes ────────────────────────────────');
  await seedPRVotes({ pullRequests: seededPRs, voterParticipationRate: 0.35, upvoteBias: 0.7 });

  console.log('[Seeder] ── Seeding PRComments ─────────────────────────────');
  await seedPRComments({
    pullRequests: seededPRs,
    commentsPerPR: { min: 1, max: 8 },
    replyDepth: 2,
  });
}

async function seedPullRequestsOnly() {
  console.log('[Seeder] ── Seeding PullRequests (Only) ───────────────────');
  const seededPRs = await seedPullRequests({
    storyLimit: 20,
    prsPerStory: { min: 2, max: 6 },
    clearExisting: false,
  });
  console.log(`[Seeder]    → ${seededPRs.length} PRs created.`);
}

async function seedPRReviewsOnly() {
  console.log('[Seeder] ── Seeding PRReviews ──────────────────────────────');
  await runPRReviewSeeder({ reviewersPerPR: { min: 1, max: 3 } });
}

async function seedPRVotesOnly() {
  console.log('[Seeder] ── Seeding PRVotes ────────────────────────────────');
  await runPRVoteSeeder({ voterParticipationRate: 0.35, upvoteBias: 0.7 });
}

async function seedPRCommentsOnly() {
  console.log('[Seeder] ── Seeding PRComments ─────────────────────────────');
  await runPRCommentSeeder({
    commentsPerPR: { min: 1, max: 8 },
    replyDepth: 2,
  });
}

// ─── Entry point ──────────────────────────────────────────────────────────────
// Usage (package.json scripts):
//   npm run seed:comments         →  SEED_TARGET=comments
//   npm run seed:votes            →  SEED_TARGET=votes
//   npm run seed:reading-history  →  SEED_TARGET=reading-history
//   npm run seed:prs              →  SEED_TARGET=prs

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('[Seeder] DB connected.\n');

  const target = process.env.SEED_TARGET;

  switch (target) {
    case 'comments':
      await seedCommentsOnly();
      break;

    case 'votes':
      await seedVotesOnly();
      break;

    case 'reading-history':
      await seedReadingHistoryOnly();
      break;

    case 'prs':
      await seedPRsOnly();
      break;

    case 'prs-only':
      await seedPullRequestsOnly();
      break;

    case 'pr-reviews':
      await seedPRReviewsOnly();
      break;

    case 'pr-votes':
      await seedPRVotesOnly();
      break;

    case 'pr-comments':
      await seedPRCommentsOnly();
      break;

    default:
      console.error(
        '[Seeder] ❌ SEED_TARGET not set. Use: "comments" | "votes" | "reading-history" | "prs" | "prs-only" | "pr-reviews" | "pr-votes" | "pr-comments".'
      );
      process.exit(1);
  }

  console.log('\n[Seeder] ✅ All done.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[Seeder] Fatal error:', err);
  process.exit(1);
});
