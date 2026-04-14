import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { PRReview } from '../src/models/prReview.model';
import { PRTimeline } from '../src/models/prTimeline.model';
import { PullRequest } from '../src/models/pullRequest.model';
import { User } from '../src/models/user.model';
import type { SeededPullRequest } from './pull-request.seeder';

import {
  PRReviewDecision,
  PR_REVIEW_DECISIONS,
} from '../src/features/prReview/types/prReview-enum';
import { PRTimelineAction } from '../src/features/pullRequest/types/pullRequest-enum';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PRReviewSeedOptions {
  /** Pass IDs from a fresh PR seeder run, or omit to fetch all PRs from DB */
  pullRequests?: SeededPullRequest[];
  /** Max reviewers per PR (excluding author). Default: { min: 1, max: 3 } */
  reviewersPerPR?: { min: number; max: number };
  /** Wipe all PRReview docs first. Default: false */
  clearExisting?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pick a decision weighted by the PR's current status so data is realistic:
 * - MERGED / APPROVED PRs → mostly APPROVE decisions
 * - REJECTED / CLOSED PRs → mostly REJECT or REQUEST_CHANGES
 * - OPEN PRs              → mixed
 */
function weightedDecision(prStatus: string): PRReviewDecision {
  if (prStatus === 'merged' || prStatus === 'approved') {
    return faker.helpers.weightedArrayElement([
      { value: 'approve' as PRReviewDecision, weight: 7 },
      { value: 'changes_requested' as PRReviewDecision, weight: 2 },
      { value: 'feedback_only' as PRReviewDecision, weight: 1 },
    ]);
  }

  if (prStatus === 'closed') {
    return faker.helpers.weightedArrayElement([
      { value: 'changes_requested' as PRReviewDecision, weight: 5 },
      { value: 'feedback_only' as PRReviewDecision, weight: 3 },
      { value: 'approve' as PRReviewDecision, weight: 2 },
    ]);
  }

  // OPEN → mixed
  return faker.helpers.weightedArrayElement([
    { value: 'approve' as PRReviewDecision, weight: 4 },
    { value: 'changes_requested' as PRReviewDecision, weight: 4 },
    { value: 'feedback_only' as PRReviewDecision, weight: 2 },
  ]);
}

function buildSummary(): string {
  const intros = [
    'Overall, this chapter ',
    'The writing here ',
    'I think this branch ',
    'After reading carefully, ',
    'This contribution ',
  ];
  return faker.helpers.arrayElement(intros) + faker.lorem.sentences({ min: 2, max: 5 });
}

// ─── Core Seeder ─────────────────────────────────────────────────────────────

export async function seedPRReviews(options: PRReviewSeedOptions = {}) {
  const { pullRequests, reviewersPerPR = { min: 1, max: 3 }, clearExisting = false } = options;

  if (clearExisting) {
    await PRReview.deleteMany({});
    console.log('[PRReviewSeeder] Cleared PRReview docs.');
  }

  // ── 1. Resolve PRs and users ─────────────────────────────────────────────
  const [prs, users] = await Promise.all([
    pullRequests
      ? Promise.resolve(pullRequests)
      : PullRequest.find({})
          .select('_id storySlug status authorId')
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
    console.warn('[PRReviewSeeder] No PRs or users — skipping.');
    return 0;
  }

  const userIds = users.map((u) => u.clerkId);

  // ── 2. Build review docs ─────────────────────────────────────────────────
  const reviewDocs: object[] = [];
  const timelineDocs: object[] = [];

  // Track approvalsStatus updates per PR: prId → { approvers, blockers }
  const approvalMap = new Map<
    string,
    { approvers: string[]; blockers: string[]; reviewCount: number }
  >();

  for (const pr of prs) {
    const prIdStr = pr._id.toString();
    const reviewerCount = faker.number.int(reviewersPerPR);

    // Reviewers must be different from each other (unique per PR enforced by index)
    const reviewers = faker.helpers.arrayElements(
      userIds.filter((id) => id !== (pr as { authorId?: string }).authorId),
      Math.min(reviewerCount, userIds.length - 1)
    );

    if (!reviewers.length) continue;

    approvalMap.set(prIdStr, { approvers: [], blockers: [], reviewCount: reviewers.length });

    for (const reviewerId of reviewers) {
      const decision = weightedDecision(pr.status);
      const createdAt = faker.date.past({ years: 1 });

      reviewDocs.push({
        pullRequestId: pr._id,
        storySlug: pr.storySlug,
        reviewerId,
        decision,
        summary: buildSummary(),
        overallRating: faker.number.int({ min: 1, max: 5 }),
        isUpdated: faker.datatype.boolean({ probability: 0.15 }),
        updatedAt_review: createdAt,
        createdAt,
        updatedAt: new Date(),
      });

      // Timeline event
      timelineDocs.push({
        pullRequestId: pr._id,
        storySlug: pr.storySlug,
        action: PRTimelineAction.REVIEW_SUBMITTED,
        performedBy: reviewerId,
        performedAt: createdAt,
        metadata: { decision, rating: faker.number.int({ min: 1, max: 5 }) },
      });

      // Track for approvalsStatus sync
      const entry = approvalMap.get(prIdStr)!;
      if (decision === 'approve') entry.approvers.push(reviewerId);
      if (decision === 'changes_requested') entry.blockers.push(reviewerId);
    }
  }

  // ── 3. Insert ────────────────────────────────────────────────────────────
  await Promise.all([
    PRReview.insertMany(reviewDocs, { ordered: false }),
    PRTimeline.insertMany(timelineDocs, { ordered: false }),
  ]);

  // ── 4. Sync approvalsStatus + stats.reviewsReceived back onto PR ─────────
  const prBulkWrites: any[] = [];

  for (const [prIdStr, data] of Array.from(approvalMap.entries())) {
    const pr = prs.find((p) => p._id.toString() === prIdStr);
    if (!pr) continue;

    const required = 1; // fallback; real value is whatever was set on creation
    const received = data.approvers.length;
    const canMerge = received >= required && data.blockers.length === 0;

    prBulkWrites.push({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(prIdStr) },
        update: {
          $set: {
            'approvalsStatus.approvers': data.approvers,
            'approvalsStatus.blockers': data.blockers,
            'approvalsStatus.received': received,
            'approvalsStatus.pending': Math.max(0, required - received),
            'approvalsStatus.canMerge': canMerge,
            'stats.reviewsReceived': data.reviewCount,
          },
        },
      },
    });
  }

  if (prBulkWrites.length) {
    await PullRequest.bulkWrite(prBulkWrites, { ordered: false });
    console.log(`[PRReviewSeeder] Synced approvalsStatus on ${prBulkWrites.length} PRs.`);
  }

  return reviewDocs.length;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runPRReviewSeeder(options: PRReviewSeedOptions = {}) {
  const total = await seedPRReviews(options);
  console.log(`[PRReviewSeeder] ✅ Inserted ${total} PR reviews.`);
}
