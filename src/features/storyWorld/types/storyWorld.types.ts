import { Document, Types } from 'mongoose';
import { ID, IImageAsset } from '@/types';
import {
  LOCATION_TYPES,
  FACTION_ALIGNMENTS,
  FactionAlignment,
  LocationType,
} from './storyWorld-enum';

// ========================================
// DERIVED TYPES
// ========================================

export type TLocationType = (typeof LOCATION_TYPES)[number];
export type TFactionAlignment = (typeof FACTION_ALIGNMENTS)[number];

// ========================================
// EMBEDDED SUB-DOCUMENT INTERFACES
// ========================================

export interface IStoryLocation {
  _id: ID;
  name: string;
  type: TLocationType;
  description?: string;
  coordinates?: string;
  image?: IImageAsset;
  sortOrder: number;
  tags: string[];
}

export interface IStoryFaction {
  _id: ID;
  name: string;
  alignment: TFactionAlignment;
  description?: string;
  /** Lucide icon name or emoji */
  icon?: string;
  sortOrder: number;
  tags: string[];
}

export interface ITimelineEvent {
  _id: ID;
  /** String to allow both years ("1505") and narrative labels ("Act 1") */
  year: string;
  title: string;
  description?: string;
  sortOrder: number;
}

// ========================================
// ROOT MODEL INTERFACE
// ========================================

export interface IStoryWorld {
  _id: ID;
  storySlug: string;
  createdBy: string;

  // World Overview
  timePeriod?: string;
  location?: string;
  genre?: string;
  atmosphere?: string;
  worldDescription?: string;
  keyWorldElements: string[];

  // Embedded arrays
  locations: IStoryLocation[];
  factions: IStoryFaction[];
  timelineEvents: ITimelineEvent[];

  createdAt: Date;
  updatedAt: Date;
}

export interface IStoryWorldDoc extends Omit<IStoryWorld, '_id'>, Document {
  _id: Types.ObjectId;
  locations: Types.DocumentArray<IStoryLocation & Document>;
  factions: Types.DocumentArray<IStoryFaction & Document>;
  timelineEvents: Types.DocumentArray<ITimelineEvent & Document>;
}

export { LocationType, FactionAlignment };
