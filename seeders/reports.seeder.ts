import mongoose from 'mongoose';
import { User } from '../src/models/user.model';
import { Story } from '../src/models/story.model';
import { Chapter } from '../src/models/chapter.model';
import { Comment } from '../src/models/comment.model';
import { Report } from '../src/models/report.model';
import {
  ReportActionTaken,
  ReportGovernanceLevel,
  ReportReason,
  ReportStatus,
  ReportType,
} from '../src/features/report/types/report-enum';
import { env } from '../src/config/env';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDateWithin(daysBack: number): Date {
  const now = Date.now();
  const pastMs = Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return new Date(now - pastMs);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

// ─── Realistic Datasets (No Faker) ──────────────────────────────────────────

const USER_REPORTS_DATA = [
  {
    reason: ReportReason.HARASSMENT,
    description:
      'This user has been sending toxic direct messages and leaving abusive, hostile comments on all my published chapters.',
  },
  {
    reason: ReportReason.IMPERSONATION,
    description:
      'This account copied my exact profile picture, display name, and bio to impersonate me and post offensive responses in discussions.',
  },
  {
    reason: ReportReason.SPAM,
    description:
      'This user account is constantly posting automated promotional links to suspicious external gambling websites across profile boards.',
  },
  {
    reason: ReportReason.INAPPROPRIATE_CONTENT,
    description:
      'The avatar and profile bio contain explicit adult imagery and external links to unmoderated NSFW platforms.',
  },
  {
    reason: ReportReason.MISINFORMATION,
    description:
      'User is creating false community announcements and posing as a platform administrator to trick users into sharing login credentials.',
  },
  {
    reason: ReportReason.OFF_TOPIC,
    description:
      'User profile bio and public activity feed are constantly broadcasting off-topic political propaganda and cryptocurrency scams.',
  },
];

const STORY_REPORTS_DATA = [
  {
    reason: ReportReason.COPYRIGHT,
    description:
      'This story is a direct plagiarized copy of a copyrighted fantasy novel without any permission or attribution to the original author.',
  },
  {
    reason: ReportReason.VIOLENCE,
    description:
      'The narrative includes graphic depictions of extreme real-world violence and dangerous self-harm techniques without any content warnings.',
  },
  {
    reason: ReportReason.UNDERAGE_CONTENT,
    description:
      'This story depicts minor characters in explicit and inappropriate situations, violating platform terms and safety rules.',
  },
  {
    reason: ReportReason.INAPPROPRIATE_CONTENT,
    description:
      'The story plot centers around explicit non-consensual themes and hate speech targeted at real-world marginalized communities.',
  },
  {
    reason: ReportReason.SPAM,
    description:
      'This story contains empty chapters filled with repetitive filler text to artificially inflate word count and farm platform engagement coins.',
  },
  {
    reason: ReportReason.MISINFORMATION,
    description:
      'The narrative claims to present verifiable medical advice while promoting hazardous and unverified chemical ingestion.',
  },
];

const CHAPTER_REPORTS_DATA = [
  {
    reason: ReportReason.OFF_TOPIC,
    description:
      'This chapter completely strays from the story arc and posts an irrelevant rant about commercial trading software.',
  },
  {
    reason: ReportReason.SPAM,
    description:
      'Chapter text is composed entirely of copy-pasted affiliate links and nonsensical gibberish text repeated over 50 times.',
  },
  {
    reason: ReportReason.HARASSMENT,
    description:
      'The author dedicated this chapter to launching a personal smear campaign and public defamation against another community author.',
  },
  {
    reason: ReportReason.OTHER,
    description:
      'The chapter contains corrupted code snippets, unescaped raw HTML tags, and invalid characters breaking the page rendering layout.',
  },
  {
    reason: ReportReason.COPYRIGHT,
    description:
      'This specific chapter inserts multiple long passages copied verbatim from a published copyrighted book without fair use justification.',
  },
];

const COMMENT_REPORTS_DATA = [
  {
    reason: ReportReason.HARASSMENT,
    description:
      'This comment contains targeted slurs, hateful epithets, and personal insults directed at the chapter author.',
  },
  {
    reason: ReportReason.SPAM,
    description:
      'The commenter is repeatedly posting identical commercial telegram group links across all chapter comment sections.',
  },
  {
    reason: ReportReason.OFF_TOPIC,
    description:
      'This comment has no relation to the chapter content and is being used to advertise third-party commercial services.',
  },
  {
    reason: ReportReason.INAPPROPRIATE_CONTENT,
    description:
      'Comment includes explicit vulgarities and hate speech aimed at community members in the discussion thread.',
  },
  {
    reason: ReportReason.VIOLENCE,
    description:
      'Commenter is issuing explicit threats of physical violence against another community member.',
  },
];

const RESOLUTIONS = [
  {
    actionTaken: ReportActionTaken.OFFICIAL_WARNING,
    resolution:
      'Reviewed the reported content and confirmed guideline violation. Issued an official written warning to the reported user.',
  },
  {
    actionTaken: ReportActionTaken.DELETE_COMMENT,
    resolution:
      'Confirmed inappropriate content in the comment thread. Deleted the offending comment and notified the author.',
  },
  {
    actionTaken: ReportActionTaken.FLAG_CHAPTER,
    resolution:
      'Flagged the chapter for moderation review and restricted public visibility pending content revision.',
  },
  {
    actionTaken: ReportActionTaken.BAN_FROM_STORY,
    resolution:
      'User exhibited persistent disruptive behavior in this story. Banned user from submitting further chapters or comments to this story.',
  },
  {
    actionTaken: ReportActionTaken.DELETE_CONTENT,
    resolution:
      'Confirmed severe copyright/policy violation. The reported content was permanently removed from the platform.',
  },
  {
    actionTaken: ReportActionTaken.GLOBAL_BAN,
    resolution:
      'User engaged in severe, systemic community safety violations. Account suspended globally.',
  },
];

const DISMISSALS = [
  'Reviewed the reported content in detail. No violation of community guidelines or terms of service was found.',
  'Investigated the claim; content falls within creative writing policy and standard fiction guidelines.',
  'Insufficient evidence to verify harassment claims. Report dismissed.',
];

const ESCALATIONS = [
  'Escalating to platform safety team due to repeated severe safety policy violations across multiple stories.',
  'Complex copyright infringement claim requiring legal review by platform administrators.',
  'Escalated due to suspected coordinated spam ring operating across multiple user accounts.',
];

// ─── Seeder Logic ────────────────────────────────────────────────────────────

export interface ISeedReportsOptions {
  clearExisting?: boolean;
  reportsCount?: number;
}

export async function seedReports(options: ISeedReportsOptions = {}): Promise<number> {
  const { clearExisting = false, reportsCount = 20 } = options;

  console.log('[ReportSeeder] Fetching users, stories, chapters, and comments from database...');

  const [users, stories, chapters, comments] = await Promise.all([
    User.find({ isBanned: false }).select('clerkId').lean(),
    Story.find().select('slug creatorId').lean(),
    Chapter.find().select('slug storySlug authorId').lean(),
    Comment.find().select('_id chapterSlug userId').lean(),
  ]);

  const userIds = users.map((u) => u.clerkId);

  if (userIds.length < 2) {
    console.warn('[ReportSeeder] Need at least 2 users in the database to file reports — skipping.');
    return 0;
  }

  if (clearExisting) {
    await Report.deleteMany({});
    console.log('[ReportSeeder] Cleared existing reports.');
  }

  // Create lookup for chapter -> story mapping
  const chapterToStoryMap = new Map<string, string>();
  chapters.forEach((c) => chapterToStoryMap.set(c.slug, c.storySlug));

  // Track seeded combinations to prevent duplicate key errors on unique indexes
  const seededUserReports = new Set<string>(); // "reporterId:targetUserId"
  const seededStoryReports = new Set<string>(); // "reporterId:storySlug"
  const seededChapterReports = new Set<string>(); // "reporterId:chapterSlug"
  const seededCommentReports = new Set<string>(); // "reporterId:commentId"

  const reportsToInsert: Array<Record<string, unknown>> = [];

  const possibleReportTypes = [
    ReportType.USER,
    ReportType.STORY,
    ReportType.CHAPTER,
    ReportType.COMMENT,
  ];

  const possibleStatuses = [
    ReportStatus.PENDING,
    ReportStatus.UNDER_REVIEW,
    ReportStatus.RESOLVED,
    ReportStatus.DISMISSED,
    ReportStatus.ESCALATED,
  ];

  let attempts = 0;
  const maxAttempts = reportsCount * 10;

  while (reportsToInsert.length < reportsCount && attempts < maxAttempts) {
    attempts++;
    const reportType = getRandomElement(possibleReportTypes);
    const reporterId = getRandomElement(userIds);

    let doc: Record<string, unknown> | null = null;

    switch (reportType) {
      case ReportType.USER: {
        // Find a target user who is NOT the reporter
        const targetUserId = getRandomElement(userIds.filter((id) => id !== reporterId));
        if (!targetUserId) break;

        const comboKey = `${reporterId}:${targetUserId}`;
        if (seededUserReports.has(comboKey)) break;
        seededUserReports.add(comboKey);

        const template = getRandomElement(USER_REPORTS_DATA);
        doc = {
          reporterId,
          reportType: ReportType.USER,
          relatedUserId: targetUserId,
          governanceLevel: ReportGovernanceLevel.PLATFORM,
          reason: template.reason,
          description: template.description,
        };
        break;
      }

      case ReportType.STORY: {
        if (stories.length === 0) break;
        // Target a story not created by reporter
        const eligibleStories = stories.filter((s) => s.creatorId !== reporterId);
        const targetStory = eligibleStories.length > 0 ? getRandomElement(eligibleStories) : getRandomElement(stories);

        const comboKey = `${reporterId}:${targetStory.slug}`;
        if (seededStoryReports.has(comboKey)) break;
        seededStoryReports.add(comboKey);

        const template = getRandomElement(STORY_REPORTS_DATA);
        doc = {
          reporterId,
          reportType: ReportType.STORY,
          relatedStorySlug: targetStory.slug,
          governanceLevel: ReportGovernanceLevel.PLATFORM,
          reason: template.reason,
          description: template.description,
        };
        break;
      }

      case ReportType.CHAPTER: {
        if (chapters.length === 0) break;
        const eligibleChapters = chapters.filter((c) => c.authorId !== reporterId);
        const targetChapter = eligibleChapters.length > 0 ? getRandomElement(eligibleChapters) : getRandomElement(chapters);

        const comboKey = `${reporterId}:${targetChapter.slug}`;
        if (seededChapterReports.has(comboKey)) break;
        seededChapterReports.add(comboKey);

        const template = getRandomElement(CHAPTER_REPORTS_DATA);
        doc = {
          reporterId,
          reportType: ReportType.CHAPTER,
          relatedStorySlug: targetChapter.storySlug,
          relatedChapterSlug: targetChapter.slug,
          governanceLevel: ReportGovernanceLevel.STORY,
          reason: template.reason,
          description: template.description,
        };
        break;
      }

      case ReportType.COMMENT: {
        if (comments.length === 0) break;
        const eligibleComments = comments.filter((cm) => cm.userId !== reporterId);
        const targetComment = eligibleComments.length > 0 ? getRandomElement(eligibleComments) : getRandomElement(comments);

        const commentIdStr = targetComment._id.toString();
        const comboKey = `${reporterId}:${commentIdStr}`;
        if (seededCommentReports.has(comboKey)) break;
        seededCommentReports.add(comboKey);

        const storySlug = chapterToStoryMap.get(targetComment.chapterSlug) || 'unknown-story';
        const template = getRandomElement(COMMENT_REPORTS_DATA);

        doc = {
          reporterId,
          reportType: ReportType.COMMENT,
          relatedStorySlug: storySlug,
          relatedChapterSlug: targetComment.chapterSlug,
          relatedCommentId: targetComment._id,
          governanceLevel: ReportGovernanceLevel.STORY,
          reason: template.reason,
          description: template.description,
        };
        break;
      }
    }

    if (!doc) continue;

    // Assign realistic status workflow and timestamps
    const status = getRandomElement(possibleStatuses);
    const createdAt = getRandomDateWithin(30);

    doc.status = status;
    doc.createdAt = createdAt;
    doc.updatedAt = createdAt;

    const reviewerId = getRandomElement(userIds.filter((id) => id !== reporterId)) || reporterId;

    if (status === ReportStatus.UNDER_REVIEW) {
      doc.openedBy = reviewerId;
      doc.openedAt = addHours(createdAt, 2);
      doc.updatedAt = doc.openedAt;
    } else if (status === ReportStatus.RESOLVED) {
      doc.openedBy = reviewerId;
      doc.openedAt = addHours(createdAt, 2);
      doc.resolvedBy = reviewerId;
      doc.resolvedAt = addHours(doc.openedAt as Date, 4);
      doc.updatedAt = doc.resolvedAt;

      const resolutionSample = getRandomElement(RESOLUTIONS);
      doc.resolution = resolutionSample.resolution;
      doc.actionTaken = resolutionSample.actionTaken;
    } else if (status === ReportStatus.DISMISSED) {
      doc.openedBy = reviewerId;
      doc.openedAt = addHours(createdAt, 2);
      doc.resolvedBy = reviewerId;
      doc.resolvedAt = addHours(doc.openedAt as Date, 3);
      doc.updatedAt = doc.resolvedAt;

      doc.resolution = getRandomElement(DISMISSALS);
      doc.actionTaken = ReportActionTaken.NONE;
    } else if (status === ReportStatus.ESCALATED) {
      doc.openedBy = reviewerId;
      doc.openedAt = addHours(createdAt, 2);
      doc.escalatedTo = reviewerId;
      doc.escalatedAt = addHours(doc.openedAt as Date, 5);
      doc.updatedAt = doc.escalatedAt;

      doc.escalationReason = getRandomElement(ESCALATIONS);
    }

    reportsToInsert.push(doc);
  }

  if (reportsToInsert.length === 0) {
    console.warn('[ReportSeeder] No valid report combinations could be generated.');
    return 0;
  }

  const inserted = await Report.insertMany(reportsToInsert);
  console.log(`[ReportSeeder] ✅ Successfully seeded ${inserted.length} reports.`);
  return inserted.length;
}

export async function runReportSeeder(options: ISeedReportsOptions = {}) {
  await seedReports(options);
}

// ─── Direct Script Execution ──────────────────────────────────────────────────
if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(env.MONGODB_URI);
      console.log('[ReportSeeder] Connected to MongoDB.');
      await runReportSeeder({ clearExisting: false, reportsCount: 25 });
      await mongoose.disconnect();
      console.log('[ReportSeeder] Finished and disconnected.');
    } catch (err) {
      console.error('[ReportSeeder] Error during seeding:', err);
      process.exit(1);
    }
  })();
}
