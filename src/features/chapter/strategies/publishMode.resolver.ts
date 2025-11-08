import { BaseModule } from '../../../utils';
import { IStory } from '../../story/story.types';
import { StoryCollaboratorRepository } from '../../storyCollaborator/storyCollaborator.service';
import { IChapterPublishMode } from '../chapter.types';

abstract class PublishModeStrategy<
  TStory = IStory,
  TResult extends IChapterPublishMode = IChapterPublishMode,
> extends BaseModule {
  abstract determine(story: TStory, userId: string, isRootChapter: boolean): Promise<TResult>;
}

class DirectPublishStrategy extends PublishModeStrategy {
  async determine(
    _story: IStory,
    _userId: string,
    _isRootChapter: boolean
  ): Promise<IChapterPublishMode> {
    return {
      chapterStatus: 'PUBLISHED',
      isPR: false,
    };
  }
}

class PRPublishStrategy extends PublishModeStrategy {
  async determine(
    _story: IStory,
    _userId: string,
    _isRootChapter: boolean
  ): Promise<IChapterPublishMode> {
    return {
      chapterStatus: 'PENDING_APPROVAL',
      isPR: true,
    };
  }
}

export class PublishModeResolver extends BaseModule {
  private collaboratorRepo: StoryCollaboratorRepository;
  private directStrategy = new DirectPublishStrategy();
  private prStrategy = new PRPublishStrategy();

  constructor(collaboratorRepo: StoryCollaboratorRepository) {
    super();
    this.collaboratorRepo = collaboratorRepo;
  }

  async resolve(
    story: IStory,
    userId: string,
    isRootChapter: boolean
  ): Promise<IChapterPublishMode> {
    if (isRootChapter) return this.directStrategy.determine(story, userId, isRootChapter);

    if (!story.settings.requireApproval)
      return this.directStrategy.determine(story, userId, isRootChapter);

    if (story.creatorId.toString() === userId)
      return this.directStrategy.determine(story, userId, isRootChapter);

    if (await this._hasApprovalBypass(String(story._id), userId))
      return this.directStrategy.determine(story, userId, isRootChapter);

    return this.prStrategy.determine(story, userId, isRootChapter);
  }

  private async _hasApprovalBypass(storyId: string, userId: string): Promise<boolean> {
    const collaborator = await this.collaboratorRepo.findCollaborator(storyId, userId, 'ACCEPTED');
    return collaborator?.permissions?.canApprove ?? false;
  }
}
