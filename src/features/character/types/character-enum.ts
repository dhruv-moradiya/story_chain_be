enum CharacterRole {
  PROTAGONIST = 'protagonist',
  ANTAGONIST = 'antagonist',
  MENTOR = 'mentor',
  ALLY = 'ally',
  NEUTRAL = 'neutral',
  SUPPORTING = 'supporting',
  MINOR = 'minor',
}

const CHARACTER_ROLES = Object.values(CharacterRole) as [CharacterRole, ...CharacterRole[]];

enum CharacterGender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary',
  OTHER = 'other',
  UNSPECIFIED = 'unspecified',
}

const CHARACTER_GENDERS = Object.values(CharacterGender) as [CharacterGender, ...CharacterGender[]];

enum CharacterStatus {
  ALIVE = 'alive',
  DECEASED = 'deceased',
  UNKNOWN = 'unknown',
  MISSING = 'missing',
}

const CHARACTER_STATUSES = Object.values(CharacterStatus) as [
  CharacterStatus,
  ...CharacterStatus[],
];

enum AttributeLevel {
  LAVEL_1 = 1,
  LAVEL_2 = 2,
  LAVEL_3 = 3,
  LAVEL_4 = 4,
  LAVEL_5 = 5,
  LAVEL_6 = 6,
  LAVEL_7 = 7,
  LAVEL_8 = 8,
  LAVEL_9 = 9,
  LAVEL_10 = 10,
}

const ATTRIBUTE_LEVELS = Object.values(AttributeLevel) as [AttributeLevel, ...AttributeLevel[]];

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

const RELATIONSHIP_TYPES = Object.values(RelationshipType) as [
  RelationshipType,
  ...RelationshipType[],
];

enum AppearanceRole {
  MAIN = 'main',
  SUPPORTING = 'supporting',
  CAMEO = 'cameo',
  MENTIONED = 'mentioned',
}

const APPEARANCE_ROLES = Object.values(AppearanceRole) as [AppearanceRole, ...AppearanceRole[]];

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
