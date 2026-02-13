import { PipelineStage } from 'mongoose';

export class CommentVotePipelines {
  static getVoteStats(commentId: string): PipelineStage[] {
    return [
      {
        $match: {
          commentId: commentId,
        },
      },
    ];
  }
}
