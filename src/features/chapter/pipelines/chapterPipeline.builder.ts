import { PipelineStage } from 'mongoose';

class ChapterPipelineBuilder {
  private pipeline: PipelineStage[] = [];

  /**
   * Step 1: Load chapters for a story
   */
  loadChaptersForStory(storySlug: string) {
    this.pipeline.push({
      $match: {
        storySlug,
      },
    });

    return this;
  }

  /**
   * Step 2: Lookup author (only required fields)
   */
  getAuthorDetails() {
    this.pipeline.push({
      $lookup: {
        from: 'users',
        let: { authorId: '$authorId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$clerkId', '$$authorId'],
              },
            },
          },
          {
            $project: {
              _id: 0,
              clerkId: 1,
              username: 1,
              avatarUrl: 1,
            },
          },
        ],
        as: 'author',
      },
    });

    return this;
  }

  /**
   * Step 3: Prepare graph-ready chapter node
   * - normalize author
   * - extract prId
   * - remove internal fields
   */
  buildChapterGraphNode() {
    this.pipeline.push(
      {
        $set: {
          author: { $arrayElemAt: ['$author', 0] },
          prId: {
            $ifNull: ['$pullRequest.prId', null],
          },
        },
      },
      {
        $unset: ['authorId', 'content', 'pullRequest'],
      }
    );

    return this;
  }

  build() {
    return this.pipeline;
  }
}

export { ChapterPipelineBuilder };
