import { FileUploadType } from '@shared/constants/app.constants';

/**
 * Format file size in bytes to human-readable format
 * @param bytes File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get appropriate Lucide icon name for file type
 * @param fileType Type of file (image, video, audio, document)
 * @param fileName Optional filename to determine specific document icon
 * @returns Lucide icon name
 */
export function getFileIcon(fileType?: FileUploadType, fileName?: string): string {
  switch (fileType) {
    case 'image':
      return 'lucideImage';
    case 'video':
      return 'lucideVideo';
    case 'audio':
      return 'lucideMusic';
    case 'document':
      return getDocumentIcon(fileName);
    default:
      return 'lucideFile';
  }
}

/**
 * Get specific document icon based on file extension
 * @param fileName File name with extension
 * @returns Lucide icon name for document type
 */
function getDocumentIcon(fileName?: string): string {
  if (!fileName) return 'lucideFile';

  const lowerName = fileName.toLowerCase();

  // Archive files
  if (
    lowerName.endsWith('.zip') ||
    lowerName.endsWith('.rar') ||
    lowerName.endsWith('.7z') ||
    lowerName.endsWith('.tar') ||
    lowerName.endsWith('.gz')
  ) {
    return 'lucideFileArchive';
  }

  // Text/Document files
  if (
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.pdf')
  ) {
    return 'lucideFileText';
  }

  // Default file icon
  return 'lucideFile';
}

/**
 * Get file extension from filename
 * @param fileName File name
 * @returns File extension (lowercase, without dot)
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Check if file is an image based on extension
 * @param fileName File name
 * @returns True if file is an image
 */
export function isImageFile(fileName: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  return imageExtensions.includes(getFileExtension(fileName));
}

/**
 * Check if file is a video based on extension
 * @param fileName File name
 * @returns True if file is a video
 */
export function isVideoFile(fileName: string): boolean {
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
  return videoExtensions.includes(getFileExtension(fileName));
}

/**
 * Check if file is audio based on extension
 * @param fileName File name
 * @returns True if file is audio
 */
export function isAudioFile(fileName: string): boolean {
  const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
  return audioExtensions.includes(getFileExtension(fileName));
}
