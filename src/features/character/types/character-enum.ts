enum CharacterRole {
  PROTAGONIST = 'protagonist',
  ANTAGONIST = 'antagonist',
  MENTOR = 'mentor',
  ALLY = 'ally',
  NEUTRAL = 'neutral',
  SUPPORTING = 'supporting',
  MINOR = 'minor',
}

const CHARACTER_ROLES = [
  'protagonist',
  'antagonist',
  'mentor',
  'ally',
  'neutral',
  'supporting',
  'minor',
] as const;

enum CharacterGender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary',
  OTHER = 'other',
  UNSPECIFIED = 'unspecified',
}

const CHARACTER_GENDERS = ['male', 'female', 'non_binary', 'other', 'unspecified'] as const;

enum CharacterStatus {
  ALIVE = 'alive',
  DECEASED = 'deceased',
  UNKNOWN = 'unknown',
  MISSING = 'missing',
}

const CHARACTER_STATUSES = ['alive', 'deceased', 'unknown', 'missing'] as const;

enum AttributeLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

const ATTRIBUTE_LEVELS = ['none', 'low', 'medium', 'high', 'very_high'] as const;

enum RelationshipType {
  FAMILY = 'family',
  FRIEND = 'friend',
  ENEMY = 'enemy',
  MENTOR = 'mentor',
  ALLY = 'ally',
  ROMANTIC = 'romantic',
  RIVAL = 'rival',
  OTHER = 'other',
}

const RELATIONSHIP_TYPES = [
  'family',
  'friend',
  'enemy',
  'mentor',
  'ally',
  'romantic',
  'rival',
  'other',
] as const;

enum AppearanceRole {
  MAIN = 'main',
  SUPPORTING = 'supporting',
  CAMEO = 'cameo',
  MENTIONED = 'mentioned',
}

const APPEARANCE_ROLES = ['main', 'supporting', 'cameo', 'mentioned'] as const;

export {
  CharacterRole,
  CHARACTER_ROLES,
  CharacterGender,
  CHARACTER_GENDERS,
  CharacterStatus,
  CHARACTER_STATUSES,
  AttributeLevel,
  ATTRIBUTE_LEVELS,
  RelationshipType,
  RELATIONSHIP_TYPES,
  AppearanceRole,
  APPEARANCE_ROLES,
};
