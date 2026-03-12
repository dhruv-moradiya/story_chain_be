import { BaseModule } from '@/utils/baseClass';
import { singleton } from 'tsyringe';

@singleton()
class PrReviewClass extends BaseModule {
  constructor() // @inject(TOKENS.StoryCollaboratorRepository)
  // private readonly storyCollaboratorRepository: StoryCollaboratorRepository,
  // @inject(TOKENS.PullRequestService)
  // private readonly pullRequestService: PullRequestService
  {
    super();
  }
}

export { PrReviewClass };
