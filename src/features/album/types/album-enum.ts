import {
  GalleryCategory,
  GALLERY_CATEGORIES,
} from '@features/galleryImage/types/galleryImage-enum';

enum AlbumVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  COLLABORATORS_ONLY = 'collaborators_only',
}

const ALBUM_VISIBILITIES = ['public', 'private', 'collaborators_only'] as const;

export { AlbumVisibility, ALBUM_VISIBILITIES, GalleryCategory, GALLERY_CATEGORIES };
