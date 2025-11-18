export interface IMessage {
  id: string;
  text?: string; // Optional - not needed for media-only messages
  user: string;
  conversation?: string; // Reference to conversation

  // File/Media fields
  file?: string; // File name from PocketBase
  fileType?: 'image' | 'video' | 'audio' | 'document';
  fileName?: string;
  fileSize?: number;
  thumbnail?: string; // Thumbnail for videos

  // PocketBase metadata - added to support immediate file URL generation for realtime records
  collectionId?: string;
  collectionName?: string;

  created: string;
  updated: string;
  expand?: {
    user?: {
      id: string;
      username: string;
      email: string;
      avatar?: string;
    };
  };
}
