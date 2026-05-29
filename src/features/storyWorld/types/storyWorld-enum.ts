enum LocationType {
  MAJOR = 'major',
  CITY = 'city',
  REGION = 'region',
  VILLAGE = 'village',
  LANDMARK = 'landmark',
  OTHER = 'other',
}

const LOCATION_TYPES = ['major', 'city', 'region', 'village', 'landmark', 'other'] as const;

enum FactionAlignment {
  NEUTRAL = 'neutral',
  AUTHORITY = 'authority',
  HOSTILE = 'hostile',
  SECRETIVE = 'secretive',
  FRIENDLY = 'friendly',
  UNKNOWN = 'unknown',
}

const FACTION_ALIGNMENTS = [
  'neutral',
  'authority',
  'hostile',
  'secretive',
  'friendly',
  'unknown',
] as const;

export { LocationType, LOCATION_TYPES, FactionAlignment, FACTION_ALIGNMENTS };
