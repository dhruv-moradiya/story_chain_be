import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';
import { ID } from '@/types';
import { toId } from '@/utils';

export class CharacterPipelineBuilder extends BasePipelineBuilder<CharacterPipelineBuilder> {
  /**
   * Filter characters by story slug
   */
  byStorySlug(storySlug: string): CharacterPipelineBuilder {
    this.pipeline.push({
      $match: {
        storySlug,
      },
    });
    return this;
  }

  /**
   * Filter character by ID
   */
  byId(characterId: ID): CharacterPipelineBuilder {
    this.pipeline.push({
      $match: {
        _id: toId(characterId),
      },
    });
    return this;
  }

  /**
   * Filter characters by role in story
   */
  byRole(role: string): CharacterPipelineBuilder {
    this.pipeline.push({
      $match: {
        roleInStory: role,
      },
    });
    return this;
  }

  /**
   * Sort characters (defaults to createdAt descending)
   */
  sortByField(field: string = 'createdAt', order: 1 | -1 = -1): CharacterPipelineBuilder {
    this.pipeline.push({
      $sort: {
        [field]: order,
      },
    });
    return this;
  }
}
