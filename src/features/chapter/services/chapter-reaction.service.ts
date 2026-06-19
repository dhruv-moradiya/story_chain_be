import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { VoteService, VoteType } from '@/shared/services/vote.service';

@singleton()
export class ChapterReactionService extends BaseModule {
  constructor(
    @inject(TOKENS.VoteService)
    private readonly voteService: VoteService
  ) {
    super();
  }

  async reactToChapter(chapterSlug: string, userId: string, voteType: VoteType = 'upvote') {
    return this.voteService.voteOnChapter(chapterSlug, userId, voteType);
  }
}
