enum StoryGenre {
  // Popular
  FANTASY = 'fantasy',
  ROMANCE = 'romance',
  ACTION = 'action',
  ADVENTURE = 'adventure',
  MYSTERY = 'mystery',
  HORROR = 'horror',
  SCI_FI = 'sci_fi',
  THRILLER = 'thriller',
  COMEDY = 'comedy',
  DRAMA = 'drama',

  // Japanese
  ISEKAI = 'isekai',
  SHOUNEN = 'shounen',
  SHOUJO = 'shoujo',
  SEINEN = 'seinen',
  JOSEI = 'josei',
  MECHA = 'mecha',
  MAHOU_SHOUJO = 'mahou_shoujo',
  SLICE_OF_LIFE = 'slice_of_life',
  YURI = 'yuri',
  YAOI = 'yaoi',
  BOYS_LOVE = 'boys_love',
  GIRLS_LOVE = 'girls_love',
  OTOME = 'otome',
  VILLAINESS = 'villainess',
  LIGHT_NOVEL = 'light_novel',
  ECCHI = 'ecchi',

  // Chinese
  XIANXIA = 'xianxia',
  WUXIA = 'wuxia',
  XUANHUAN = 'xuanhuan',
  CULTIVATION = 'cultivation',
  QIHUAN = 'qihuan',
  XIANXIA_ROMANCE = 'xianxia_romance',
  ANCIENT_CHINA = 'ancient_china',
  PALACE_INTRIGUE = 'palace_intrigue',
  REBIRTH = 'rebirth',
  TRANSMIGRATION = 'transmigration',
  QUICK_TRANSMIGRATION = 'quick_transmigration',
  CEO_ROMANCE = 'ceo_romance',
  MODERN_ROMANCE_CN = 'modern_romance_cn',

  // Korean
  KOREAN_FANTASY = 'korean_fantasy',
  HUNTER = 'hunter',
  MURIM = 'murim',
  REGRESSION = 'regression',
  POSSESSION = 'possession',
  RETURN = 'return',
  GATE = 'gate',
  DUNGEON = 'dungeon',
  TOWER = 'tower',
  CONSTELLATION = 'constellation',
  SYSTEM = 'system',
  STATUS_WINDOW = 'status_window',
  KOREAN_ROMANCE = 'korean_romance',
  CONTRACT_MARRIAGE = 'contract_marriage',
  CHAEBOL = 'chaebol',

  // LitRPG & GameLit
  LITRPG = 'litrpg',
  GAMELIT = 'gamelit',
  VRMMO = 'vrmmo',
  PROGRESSION_FANTASY = 'progression_fantasy',

  // Fantasy subtypes
  DARK_FANTASY = 'dark_fantasy',
  URBAN_FANTASY = 'urban_fantasy',
  EPIC_FANTASY = 'epic_fantasy',
  HIGH_FANTASY = 'high_fantasy',
  LOW_FANTASY = 'low_fantasy',
  SWORD_AND_SORCERY = 'sword_and_sorcery',
  MAGICAL_REALISM = 'magical_realism',
  SUPERNATURAL = 'supernatural',
  PARANORMAL = 'paranormal',

  // Sci-Fi subtypes
  SPACE_OPERA = 'space_opera',
  HARD_SCI_FI = 'hard_sci_fi',
  SOFT_SCI_FI = 'soft_sci_fi',
  CYBERPUNK = 'cyberpunk',
  STEAMPUNK = 'steampunk',
  DYSTOPIAN = 'dystopian',
  POST_APOCALYPTIC = 'post_apocalyptic',
  TIME_TRAVEL = 'time_travel',
  ALTERNATE_HISTORY = 'alternate_history',

  // Romance subtypes
  HAREM = 'harem',
  REVERSE_HAREM = 'reverse_harem',
  SLOW_BURN = 'slow_burn',
  ENEMIES_TO_LOVERS = 'enemies_to_lovers',
  FRIENDS_TO_LOVERS = 'friends_to_lovers',
  FAKE_DATING = 'fake_dating',
  SECOND_CHANCE = 'second_chance',
  ARRANGED_MARRIAGE = 'arranged_marriage',
  EROTICA = 'erotica',

  // Horror & Dark
  ZOMBIE = 'zombie',
  VAMPIRE = 'vampire',
  WEREWOLF = 'werewolf',
  GHOST = 'ghost',
  APOCALYPTIC = 'apocalyptic',
  PSYCHOLOGICAL = 'psychological',

  // Mystery & Thriller
  DETECTIVE = 'detective',
  NOIR = 'noir',
  COZY_MYSTERY = 'cozy_mystery',
  LEGAL_THRILLER = 'legal_thriller',
  MEDICAL_THRILLER = 'medical_thriller',
  SPY = 'spy',
  HEIST = 'heist',
  CRIME = 'crime',

  // Character Types
  OVERPOWERED_MC = 'overpowered_mc',
  WEAK_TO_STRONG = 'weak_to_strong',
  ANTI_HERO = 'anti_hero',
  VILLAIN = 'villain',
  SUPERHERO = 'superhero',
  REINCARNATION = 'reincarnation',

  // Settings
  ACADEMY = 'academy',
  ROYAL = 'royal',
  MILITARY = 'military',
  HISTORICAL = 'historical',
  MARTIAL_ARTS = 'martial_arts',

  // Other
  FANFICTION = 'fanfiction',
  FAIRY_TALE = 'fairy_tale',
  MYTHOLOGY = 'mythology',
  FOLKLORE = 'folklore',
  SPORTS = 'sports',
  SURVIVAL = 'survival',
  WESTERN = 'western',
  SATIRE = 'satire',
  COMING_OF_AGE = 'coming_of_age',
  LITERARY_FICTION = 'literary_fiction',
  ANTHOLOGY = 'anthology',
  OTHER = 'other',
}

const STORY_GENRES = [
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
] as const;

enum StoryContentRating {
  ALL_AGES = 'all_ages',
  GENERAL = 'general',
  TEEN = 'teen',
  YOUNG_ADULT = 'young_adult',
  MATURE = 'mature',
  R18 = 'r18',
  R18G = 'r18g',
}

const STORY_CONTENT_RATINGS = [
  'all_ages',
  'general',
  'teen',
  'young_adult',
  'mature',
  'r18',
  'r18g',
] as const;

enum StoryStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

const STORY_STATUSES = ['draft', 'published', 'archived', 'deleted'] as const;

export {
  STORY_GENRES,
  STORY_CONTENT_RATINGS,
  STORY_STATUSES,
  StoryGenre,
  StoryContentRating,
  StoryStatus,
};
