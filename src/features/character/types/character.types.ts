import { Document, Types } from 'mongoose';
import { ID, IImageAsset } from '@/types';
import {
  CHARACTER_ROLES,
  CHARACTER_GENDERS,
  CHARACTER_STATUSES,
  ATTRIBUTE_LEVELS,
  RELATIONSHIP_TYPES,
  APPEARANCE_ROLES,
  CharacterRole,
  CharacterGender,
  CharacterStatus,
  AttributeLevel,
  RelationshipType,
  AppearanceRole,
} from './character-enum';

// ========================================
// DERIVED TYPES
// ========================================

export type TCharacterRole = (typeof CHARACTER_ROLES)[number];
export type TCharacterGender = (typeof CHARACTER_GENDERS)[number];
export type TCharacterStatus = (typeof CHARACTER_STATUSES)[number];
export type TAttributeLevel = (typeof ATTRIBUTE_LEVELS)[number];
export type TRelationshipType = (typeof RELATIONSHIP_TYPES)[number];
export type TAppearanceRole = (typeof APPEARANCE_ROLES)[number];

// ========================================
// EMBEDDED SUB-DOCUMENT INTERFACES
// ========================================

export interface ICharacterAppearance {
  height?: string;
  build?: string;
  hair?: string;
  eyes?: string;
  distinctiveFeatures?: string;
  clothingStyle?: string;
}

export interface ICharacterAttributes {
  bravery?: TAttributeLevel;
  intelligence?: TAttributeLevel;
  loyalty?: TAttributeLevel;
  cunning?: TAttributeLevel;
  empathy?: TAttributeLevel;
  ambition?: TAttributeLevel;
}

export interface ICharacterRelationship {
  _id: ID;
  toCharacterId: ID;
  relationshipType?: TRelationshipType;
  /** Human-readable label e.g. "Father", "Sister", "Rival" */
  label?: string;
  description?: string;
  /** 0–100 strength percentage */
  strengthPercentage: number;
}

export interface ICharacterChapterAppearance {
  _id: ID;
  chapterSlug: string;
  role?: TAppearanceRole;
  description?: string;
}

// ========================================
// ROOT MODEL INTERFACE
// ========================================

export interface ICharacter {
  _id: ID;
  storySlug: string;
  createdBy: string;

  // Basic Information
  image?: IImageAsset;
  fullName: string;
  nickname?: string;
  roleInStory: TCharacterRole;
  age?: number;
  gender?: TCharacterGender;
  nationality?: string;
  occupation?: string;
  statusInStory?: TCharacterStatus;

  // About
  biography?: string;
  personality?: string;
  motivationGoal?: string;

  // Personal Details
  languages: string[];
  birthplace?: string;
  family?: string;
  education?: string;

  // Additional Details
  strengths: string[];
  weaknesses: string[];
  greatestFear?: string;
  habitsQuirks?: string;
  secrets?: string;

  // Appearance
  appearance: ICharacterAppearance;

  // Attributes (radar chart)
  attributes: ICharacterAttributes;

  // Detail extras
  quote?: string;
  quickFacts: string[];
  firstAppearsChapterSlug?: string;

  tags: string[];

  // Embedded arrays
  relationships: ICharacterRelationship[];
  appearances: ICharacterChapterAppearance[];

  createdAt: Date;
  updatedAt: Date;
}

export interface ICharacterDoc extends Omit<ICharacter, '_id'>, Document {
  _id: Types.ObjectId;
  relationships: Types.DocumentArray<ICharacterRelationship & Document>;
  appearances: Types.DocumentArray<ICharacterChapterAppearance & Document>;
}

export {
  CharacterRole,
  CharacterGender,
  CharacterStatus,
  AttributeLevel,
  RelationshipType,
  AppearanceRole,
};
