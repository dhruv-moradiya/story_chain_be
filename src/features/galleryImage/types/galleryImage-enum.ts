enum GalleryCategory {
  LOCATION = 'location',
  CHARACTER = 'character',
  OBJECT = 'object',
  EVENT = 'event',
  THEME = 'theme',
  OTHER = 'other',
}

const GALLERY_CATEGORIES = ['location', 'character', 'object', 'event', 'theme', 'other'] as const;

export { GalleryCategory, GALLERY_CATEGORIES };
