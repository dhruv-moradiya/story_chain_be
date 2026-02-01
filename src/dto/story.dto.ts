import { z } from 'zod';
import { ID } from '@/types';
import { TStoryAddChapterSchema } from '@schema/request/story.schema';
import { TStoryCollaboratorRole } from '@features/storyCollaborator/types/storyCollaborator.types';
import {
  IStorySettings,
  TStoryContentRating,
  TStoryGenre,
  TStoryStatus,
} from '@features/story/types/story.types';

const StoryUpdateDTO = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Slug must be at least 3 characters long')
    .optional(),

  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional(),

  coverImage: z
    .object({
      url: z.string().url().optional(),
      publicId: z.string().optional(),
    })
    .optional(),

  settings: z
    .object({
      isPublic: z.boolean().optional(),
      allowBranching: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
      allowComments: z.boolean().optional(),
      allowVoting: z.boolean().optional(),
      genres: z
        .array(
          z.enum([
            // Popular
            'fantasy',
            'romance',
            'action',
            'adventure',
            'mystery',
            'horror',
            'sci_fi',
            'thriller',
            'comedy',
            'drama',
            // Japanese
            'isekai',
            'shounen',
            'shoujo',
            'seinen',
            'josei',
            'mecha',
            'mahou_shoujo',
            'slice_of_life',
            'yuri',
            'yaoi',
            'boys_love',
            'girls_love',
            'otome',
            'villainess',
            'light_novel',
            'ecchi',
            // Chinese
            'xianxia',
            'wuxia',
            'xuanhuan',
            'cultivation',
            'qihuan',
            'xianxia_romance',
            'ancient_china',
            'palace_intrigue',
            'rebirth',
            'transmigration',
            'quick_transmigration',
            'ceo_romance',
            'modern_romance_cn',
            // Korean
            'korean_fantasy',
            'hunter',
            'murim',
            'regression',
            'possession',
            'return',
            'gate',
            'dungeon',
            'tower',
            'constellation',
            'system',
            'status_window',
            'korean_romance',
            'contract_marriage',
            'chaebol',
            // LitRPG & GameLit
            'litrpg',
            'gamelit',
            'vrmmo',
            'progression_fantasy',
            // Fantasy subtypes
            'dark_fantasy',
            'urban_fantasy',
            'epic_fantasy',
            'high_fantasy',
            'low_fantasy',
            'sword_and_sorcery',
            'magical_realism',
            'supernatural',
            'paranormal',
            // Sci-Fi subtypes
            'space_opera',
            'hard_sci_fi',
            'soft_sci_fi',
            'cyberpunk',
            'steampunk',
            'dystopian',
            'post_apocalyptic',
            'time_travel',
            'alternate_history',
            // Romance subtypes
            'harem',
            'reverse_harem',
            'slow_burn',
            'enemies_to_lovers',
            'friends_to_lovers',
            'fake_dating',
            'second_chance',
            'arranged_marriage',
            'erotica',
            // Horror & Dark
            'zombie',
            'vampire',
            'werewolf',
            'ghost',
            'apocalyptic',
            'psychological',
            // Mystery & Thriller
            'detective',
            'noir',
            'cozy_mystery',
            'legal_thriller',
            'medical_thriller',
            'spy',
            'heist',
            'crime',
            // Character Types
            'overpowered_mc',
            'weak_to_strong',
            'anti_hero',
            'villain',
            'superhero',
            'reincarnation',
            // Settings
            'academy',
            'royal',
            'military',
            'historical',
            'martial_arts',
            // Other
            'fanfiction',
            'fairy_tale',
            'mythology',
            'folklore',
            'sports',
            'survival',
            'western',
            'satire',
            'coming_of_age',
            'literary_fiction',
            'anthology',
            'other',
          ])
        )
        .optional(),
      contentRating: z
        .enum(['all_ages', 'general', 'teen', 'young_adult', 'mature', 'r18', 'r18g'])
        .optional(),
    })
    .partial()
    .optional(),

  tags: z.array(z.string().trim().toLowerCase()).optional(),

  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED']).optional(),

  trendingScore: z.number().optional(),
  lastActivityAt: z.date().optional(),
  publishedAt: z.date().optional(),
});

interface IStoryCreateDTO {
  title: string;
  slug: string;
  description: string;
  settings: IStorySettings;
  status: TStoryStatus;
  tags: string[];
  creatorId: string;
}

type IStoryUpdateDTO = z.infer<typeof StoryUpdateDTO>;

type TStoryAddChapterDTO = TStoryAddChapterSchema & {
  storyId: ID;
  userId: string;
};

type IPublishedStoryDTO = {
  storyId: ID;
  userId: string;
};

type TStoryCreateInviteLinkDTO = {
  slug: string;
  role: TStoryCollaboratorRole;
  invitedUser: {
    id: string;
    name: string;
  };
  inviterUser: {
    id: string;
    name: string;
  };
};

interface IGetAllCollaboratorsDTO {
  storyId: ID;
  userId: string;
}

interface IGetAllCollaboratorsBySlugDTO {
  storyId: ID;
  userId: string;
}

interface IStoryCollaboratorAcceptInvitationDTO {
  slug: string;
  userId: string;
}

interface IStoryUpdateSettingDTO {
  storyId: ID;
  isPublic: boolean;
  allowBranching: boolean;
  requireApproval: boolean;
  allowComments: boolean;
  allowVoting: boolean;
  genres: TStoryGenre[];
  contentRating: TStoryContentRating;
}

interface IStoryUpdateCoverImageBySlugDTO {
  slug: ID;
  coverImage: {
    url: string;
    publicId: string;
  };
}

interface IStoryUpdateCardImageBySlugDTO {
  slug: ID;
  cardImage: {
    url: string;
    publicId: string;
  };
}

interface IUpdateStoryStatusDTO {
  slug: string;
  userId: string;
  status: TStoryStatus;
}

export { StoryUpdateDTO };
export type {
  IStoryCreateDTO,
  IStoryUpdateDTO,
  TStoryAddChapterDTO,
  IPublishedStoryDTO,
  TStoryCreateInviteLinkDTO,
  IStoryCollaboratorAcceptInvitationDTO,
  IGetAllCollaboratorsDTO,
  IGetAllCollaboratorsBySlugDTO,
  IStoryUpdateSettingDTO,
  IStoryUpdateCoverImageBySlugDTO,
  IUpdateStoryStatusDTO,
  IStoryUpdateCardImageBySlugDTO,
};
