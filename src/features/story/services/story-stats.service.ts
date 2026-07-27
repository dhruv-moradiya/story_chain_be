import { inject, singleton } from 'tsyringe';
import { BaseModule } from '@/utils/baseClass';
import { TOKENS } from '@/container/tokens';
import { IOperationOptions } from '@/types';
import { StoryRepository } from '../repositories/story.repository';
import { ChapterRepository } from '@/features/chapter/repositories/chapter.repository';
import { StoryCollaboratorRepository } from '@/features/storyCollaborator/repositories/storyCollaborator.repository';

@singleton()
export class StoryStatsService extends BaseModule {
  constructor(
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository,
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository,
    @inject(TOKENS.StoryCollaboratorRepository)
    private readonly collabRepo: StoryCollaboratorRepository
  ) {
    super();
  }

  /**
   * Syncs unique contributors count for a story by counting distinct:
   * 1. Story creator
   * 2. Chapter authors
   * 3. Accepted story collaborators
   */
  async syncUniqueContributors(
    storySlug: string,
    options: IOperationOptions = {}
  ): Promise<number> {
    const story = await this.storyRepo.findBySlug(storySlug, {
      fields: ['creatorId'],
      session: options.session,
    });
    if (!story) return 0;

    const contributors = new Set<string>();
    if (story.creatorId) {
      contributors.add(String(story.creatorId));
    }

    const [chapterAuthors, acceptedCollabs] = await Promise.all([
      this.chapterRepo.findDistinctAuthorIdsByStorySlug(storySlug, options),
      this.collabRepo.findDistinctAcceptedUserIdsByStorySlug(storySlug, options),
    ]);

    chapterAuthors.forEach((authorId) => {
      if (authorId) contributors.add(String(authorId));
    });

    acceptedCollabs.forEach((userId) => {
      if (userId) contributors.add(String(userId));
    });

    const count = Math.max(1, contributors.size);
    await this.storyRepo.setUniqueContributorsCount(storySlug, count, options);

    return count;
  }
}
