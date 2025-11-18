/**
 * File upload type definitions
 */
export type FileUploadType = 'image' | 'video' | 'audio' | 'document';

/**
 * File size limits in bytes
 */
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10 MB
  video: 50 * 1024 * 1024, // 50 MB
  audio: 20 * 1024 * 1024, // 20 MB
  document: 20 * 1024 * 1024, // 20 MB
  avatar: 5 * 1024 * 1024, // 5 MB for profile avatars
} as const;

/**
 * Accepted file extensions by type
 */
export const FILE_ACCEPT_TYPES = {
  image: '.jpg,.jpeg,.png,.gif,.webp',
  video: '.mp4,.webm,.ogg,.mov',
  audio: '.mp3,.wav,.ogg,.m4a,.aac',
  document: '.pdf,.doc,.docx,.txt,.zip,.rar,.7z,.csv,.xlsx,.xls',
} as const;

/**
 * File upload type configurations
 */
export const FILE_TYPE_CONFIG = {
  image: {
    label: 'Photo',
    icon: 'lucideImage',
    accept: FILE_ACCEPT_TYPES.image,
    maxSize: FILE_SIZE_LIMITS.image,
    color: 'text-blue-500',
  },
  video: {
    label: 'Video',
    icon: 'lucideVideo',
    accept: FILE_ACCEPT_TYPES.video,
    maxSize: FILE_SIZE_LIMITS.video,
    color: 'text-purple-500',
  },
  audio: {
    label: 'Audio',
    icon: 'lucideMusic',
    accept: FILE_ACCEPT_TYPES.audio,
    maxSize: FILE_SIZE_LIMITS.audio,
    color: 'text-green-500',
  },
  document: {
    label: 'Document',
    icon: 'lucideFile',
    accept: FILE_ACCEPT_TYPES.document,
    maxSize: FILE_SIZE_LIMITS.document,
    color: 'text-orange-500',
  },
} as const;

/**
 * Long press duration for message actions (in milliseconds)
 */
export const LONG_PRESS_DURATION = 500;

/**
 * Default messages per page for pagination
 */
export const MESSAGES_PER_PAGE = 50;

/**
 * Scroll behavior constants
 */
export const SCROLL_TO_BOTTOM_DELAY = 100; // milliseconds

/**
 * Debounce durations (in milliseconds)
 */
export const DEBOUNCE_DURATIONS = {
  search: 300,
  input: 150,
} as const;
