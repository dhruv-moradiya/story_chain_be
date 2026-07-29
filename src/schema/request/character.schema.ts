import {
  APPEARANCE_ROLES,
  AttributeLevel,
  CHARACTER_GENDERS,
  CHARACTER_ROLES,
  CHARACTER_STATUSES,
  RELATIONSHIP_TYPES,
} from '@/features/character/types/character-enum';
import { z } from 'zod';

export const CharacterSlugParamsSchema = z.object({
  slug: z.string().min(1, 'Story slug is required'),
});

export type TCharacterSlugParamsSchema = z.infer<typeof CharacterSlugParamsSchema>;

export const CharacterSignatureSchema = z.object({
  characterId: z.string().optional(),
});

export type TCharacterSignatureSchema = z.infer<typeof CharacterSignatureSchema>;

const emptyToUndefined = (val: unknown) => (val === '' || val === null ? undefined : val);
const emptyToUndefinedNumber = (val: unknown) => {
  if (val === '' || val === null || val === undefined) {
    return undefined;
  }

  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
};

const numberPreprocess = (val: unknown) => {
  if (val === '' || val === null || val === undefined) return undefined;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }
  return val;
};

const ImageAssetSchema = z
  .object({
    url: z.string().min(1, 'Image URL is required'),
    publicId: z.string().min(1, 'Image public ID is required'),
  })
  .optional()
  .nullable();

const CharacterAppearanceSchema = z
  .object({
    height: z.preprocess(emptyToUndefined, z.string().max(50).optional()),
    build: z.preprocess(emptyToUndefined, z.string().max(50).optional()),
    hair: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
    eyes: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
    distinctiveFeatures: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
    clothingStyle: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
  })
  .optional()
  .nullable();

const CharacterAttributesSchema = z
  .object({
    bravery: z.preprocess(emptyToUndefinedNumber, z.nativeEnum(AttributeLevel).optional()),
    intelligence: z.preprocess(emptyToUndefinedNumber, z.nativeEnum(AttributeLevel).optional()),
    loyalty: z.preprocess(emptyToUndefinedNumber, z.nativeEnum(AttributeLevel).optional()),
    cunning: z.preprocess(emptyToUndefinedNumber, z.nativeEnum(AttributeLevel).optional()),
    empathy: z.preprocess(emptyToUndefinedNumber, z.nativeEnum(AttributeLevel).optional()),
    ambition: z.preprocess(emptyToUndefinedNumber, z.nativeEnum(AttributeLevel).optional()),
  })
  .optional()
  .nullable();

const CharacterRelationshipSchema = z.object({
  toCharacterId: z.string().min(1, 'Target character ID is required'),
  relationshipType: z.preprocess(emptyToUndefined, z.enum(RELATIONSHIP_TYPES).optional()),
  label: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
  description: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
  strengthPercentage: z.preprocess(numberPreprocess, z.number().min(0).max(100).default(50)),
});

const CharacterChapterAppearanceSchema = z.object({
  chapterSlug: z.string().min(1, 'Chapter slug is required'),
  role: z.preprocess(emptyToUndefined, z.enum(APPEARANCE_ROLES).optional()),
  description: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
});

export const CharacterCreateSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required').max(200),
    roleInStory: z.enum(CHARACTER_ROLES, {
      required_error: 'Role in story is required',
    }),
    image: z.preprocess(emptyToUndefined, ImageAssetSchema),
    nickname: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
    title: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
    age: z.preprocess(numberPreprocess, z.number().min(0).max(999).optional()),
    gender: z.preprocess(emptyToUndefined, z.enum(CHARACTER_GENDERS).optional()),
    nationality: z.preprocess(emptyToUndefined, z.string().max(150).optional()),
    occupation: z.preprocess(emptyToUndefined, z.string().max(150).optional()),
    statusInStory: z.preprocess(emptyToUndefined, z.enum(CHARACTER_STATUSES).optional()),

    biography: z.preprocess(emptyToUndefined, z.string().max(1000).optional()),
    personality: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
    motivationGoal: z.preprocess(emptyToUndefined, z.string().max(500).optional()),

    languages: z.array(z.string()).default([]),
    birthplace: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
    family: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
    education: z.preprocess(emptyToUndefined, z.string().max(500).optional()),

    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    greatestFear: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
    habitsQuirks: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
    secrets: z.preprocess(emptyToUndefined, z.string().max(500).optional()),

    appearance: CharacterAppearanceSchema,
    attributes: CharacterAttributesSchema,

    quote: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
    quickFacts: z.array(z.string()).default([]),
    firstAppearsChapterSlug: z.preprocess(emptyToUndefined, z.string().optional()),

    tags: z.array(z.string()).default([]),

    relationships: z.array(CharacterRelationshipSchema).default([]),
    appearances: z.array(CharacterChapterAppearanceSchema).default([]),
  })
  .transform((data) => ({
    ...data,
    nickname: data.nickname || data.title,
  }));

export type TCharacterCreateSchema = z.infer<typeof CharacterCreateSchema>;
