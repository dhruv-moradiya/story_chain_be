import { BaseValidator } from '../../../utils';
import { storyService } from '../../story/story.service';
import { IStory } from '../../story/story.types';

export class StoryValidator extends BaseValidator {
  async validate(storyId: string): Promise<IStory> {
    const story = (await storyService.getStoryById(storyId)).toObject();

    if (!story) {
      this.throwValidationError('Story not found');
    }

    if (story.status === 'DELETED') {
      this.throwValidationError('This story has been deleted');
    }

    return story;
  }
}
