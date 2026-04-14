import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { Comment } from '../src/models/comment.model';
import { Chapter } from '../src/models/chapter.model';
import { User } from '../src/models/user.model';

// ─── Config ──────────────────────────────────────────────────────────────────
const SEED_CONFIG = {
  commentsPerChapter: { min: 3, max: 10 },
  replyDepth: 2, // how many levels of nested replies to generate
  repliesPerComment: { min: 1, max: 4 },
  deletedRatio: 0.05, // 5% of comments are soft-deleted
  editedRatio: 0.15, // 15% of comments are edited
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCommentContent(): string {
  // Picks a random "style" so comments feel varied
  const styles = [
    () => faker.lorem.sentences({ min: 1, max: 3 }),
    () => faker.lorem.paragraph({ min: 1, max: 2 }),
    () => `${faker.word.interjection()}! ${faker.lorem.sentence()}`,
    () => faker.lorem.sentence(),
  ];
  return faker.helpers.arrayElement(styles)();
}

function buildComment(
  chapterSlug: string,
  userId: string,
  parentCommentId: mongoose.Types.ObjectId | null = null
) {
  const isDeleted = faker.datatype.boolean({ probability: SEED_CONFIG.deletedRatio });
  const isEdited = !isDeleted && faker.datatype.boolean({ probability: SEED_CONFIG.editedRatio });
  const createdAt = faker.date.past({ years: 1 });

  return {
    chapterSlug,
    userId,
    parentCommentId,
    content: buildCommentContent(),
    votes: {
      upvotes: faker.number.int({ min: 0, max: 120 }),
      downvotes: faker.number.int({ min: 0, max: 20 }),
    },
    isEdited,
    editedAt: isEdited ? faker.date.between({ from: createdAt, to: new Date() }) : undefined,
    isDeleted,
    deletedAt: isDeleted ? faker.date.between({ from: createdAt, to: new Date() }) : undefined,
    reportCount: faker.number.int({ min: 0, max: 5 }),
    createdAt,
  };
}

// ─── Core Seeder ─────────────────────────────────────────────────────────────

export async function seedComments({
  chapterSlugs,
  userIds,
}: {
  chapterSlugs: string[];
  userIds: string[];
}) {
  if (!chapterSlugs.length || !userIds.length) {
    console.warn('[CommentSeeder] No chapters or users found — skipping.');
    return;
  }

  const allDocs: object[] = [];

  for (const chapterSlug of chapterSlugs) {
    const count = faker.number.int(SEED_CONFIG.commentsPerChapter);

    // ── Top-level comments ──
    const topLevelDocs = Array.from({ length: count }, () =>
      buildComment(chapterSlug, faker.helpers.arrayElement(userIds))
    );

    const inserted = await Comment.insertMany(topLevelDocs);
    allDocs.push(...inserted);

    // ── Depth-1 replies ──
    for (const parent of inserted) {
      const replyCount = faker.number.int(SEED_CONFIG.repliesPerComment);
      const depth1Replies = Array.from({ length: replyCount }, () =>
        buildComment(
          chapterSlug,
          faker.helpers.arrayElement(userIds),
          parent._id as mongoose.Types.ObjectId
        )
      );
      const insertedReplies = await Comment.insertMany(depth1Replies);
      allDocs.push(...insertedReplies);

      // ── Depth-2 replies (replies to replies) ──
      if (SEED_CONFIG.replyDepth >= 2) {
        for (const reply of insertedReplies) {
          if (faker.datatype.boolean({ probability: 0.4 })) {
            // only 40% get sub-replies
            const subReplyCount = faker.number.int({ min: 1, max: 2 });
            const subReplies = Array.from({ length: subReplyCount }, () =>
              buildComment(
                chapterSlug,
                faker.helpers.arrayElement(userIds),
                reply._id as mongoose.Types.ObjectId
              )
            );
            const insertedSubs = await Comment.insertMany(subReplies);
            allDocs.push(...insertedSubs);
          }
        }
      }
    }
  }

  return allDocs.length;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runCommentSeeder(options: {
  chapterLimit?: number; // how many chapters to seed (default: all)
  clearExisting?: boolean; // wipe comments first (default: false)
}) {
  const { chapterLimit, clearExisting = false } = options;

  console.log('[CommentSeeder] Fetching chapters and users...');

  const [chapters, users] = await Promise.all([
    Chapter.find({ status: 'published' })
      .limit(chapterLimit ?? 0)
      .select('slug')
      .lean(),
    User.find({ isBanned: false }).select('clerkId').lean(),
  ]);

  const chapterSlugs = chapters.map((c) => c.slug);
  const userIds = users.map((u) => u.clerkId);

  console.log(`[CommentSeeder] Found ${chapterSlugs.length} chapters, ${userIds.length} users.`);

  if (clearExisting) {
    await Comment.deleteMany({});
    console.log('[CommentSeeder] Cleared existing comments.');
  }

  const total = await seedComments({ chapterSlugs, userIds });
  console.log(`[CommentSeeder] ✅ Inserted ${total} comments.`);
}
