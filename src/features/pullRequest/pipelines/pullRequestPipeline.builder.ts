import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';
import { attachUserStages, PUBLIC_USER_PROJECTION } from '@/shared/pipelines';
import { ID } from '@/types';
import { toId } from '@/utils';

class PullRequestPipelineBuilder extends BasePipelineBuilder<PullRequestPipelineBuilder> {
  findById(prId: ID) {
    this.pipeline.push({
      $match: {
        _id: toId(prId),
      },
    });
    return this;
  }

  matchAuthor(userId: string) {
    this.pipeline.push({
      $match: {
        authorId: userId,
      },
    });
    return this;
  }

  matchStatus(statuses: string[]) {
    this.pipeline.push({
      $match: {
        status: { $in: statuses },
      },
    });
    return this;
  }

  attachAuthor() {
    this.pipeline.push(
      ...attachUserStages({
        localField: 'authorId',
        as: 'author',
        project: PUBLIC_USER_PROJECTION,
      })
    );
    return this;
  }

  attachReviewers() {
    this.pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'approvalsStatus.approvers',
          foreignField: 'clerkId',
          pipeline: [{ $project: { _id: 0, clerkId: 1, username: 1, avatarUrl: 1 } }],
          as: 'approvers',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'approvalsStatus.blockers',
          foreignField: 'clerkId',
          pipeline: [{ $project: { _id: 0, clerkId: 1, username: 1, avatarUrl: 1 } }],
          as: 'blockers',
        },
      }
    );
    return this;
  }

  attachStory() {
    this.pipeline.push(
      {
        $lookup: {
          from: 'stories',
          let: { storySlug: '$storySlug' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$slug', '$$storySlug'] },
              },
            },
            { $project: { _id: 0, title: 1, slug: 1 } },
          ],
          as: 'story',
        },
      },
      {
        $unwind: {
          path: '$story',
          preserveNullAndEmptyArrays: true,
        },
      }
    );
    return this;
  }

  attachChapter() {
    this.pipeline.push(
      {
        $lookup: {
          from: 'chapters',
          let: { chapterSlug: '$chapterSlug', parentSlug: '$parentChapterSlug' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$slug', '$$chapterSlug'] },
              },
            },
            {
              $lookup: {
                from: 'chapters',
                let: { pSlug: '$$parentSlug' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$slug', '$$pSlug'] } } },
                  { $project: { _id: 0, title: 1, slug: 1 } },
                ],
                as: 'parentChapter',
              },
            },
            { $unwind: { path: '$parentChapter', preserveNullAndEmptyArrays: true } },
            { $project: { _id: 0, title: 1, slug: 1, parentChapter: 1 } },
          ],
          as: 'chapter',
        },
      },
      {
        $unwind: {
          path: '$chapter',
          preserveNullAndEmptyArrays: true,
        },
      }
    );
    return this;
  }

  getCurrentUserPRsPreset(userId: string) {
    return this.matchAuthor(userId)
      .matchStatus(['open', 'approved'])
      .attachAuthor()
      .attachStory()
      .attachChapter()
      .attachReviewers()
      .sortByCreatedAt(-1)
      .build();
  }
}

export { PullRequestPipelineBuilder };
