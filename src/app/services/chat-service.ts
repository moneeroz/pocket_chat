import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth-service';
import { RelationService } from './relation-service';
import { ConversationService } from './conversation-service';
import { IMessage } from '@shared/interfaces/imessage';
import { FileUploadType, MESSAGES_PER_PAGE } from '@shared/constants/app.constants';
import { handleError } from '@shared/utils/error.utils';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly authService = inject(AuthService);
  private readonly relationService = inject(RelationService);
  private readonly conversationService = inject(ConversationService);
  private readonly pb = this.authService.getPocketBase();

  // Signals for reactive state
  private readonly messagesSignal = signal<IMessage[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  // Public readonly signals
  readonly messages = this.messagesSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  private unsubscribe?: () => void;

  /**
   * Fetch initial messages from PocketBase for a specific conversation
   */
  async fetchMessages(
    conversationId: string,
    page: number = 1,
    perPage: number = MESSAGES_PER_PAGE
  ): Promise<void> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const resultList = await this.pb.collection('messages').getList<IMessage>(page, perPage, {
        filter: `conversation = "${conversationId}"`,
        sort: 'created',
        expand: 'user',
      });

      this.messagesSignal.set(resultList.items);
    } catch (error: any) {
      const errorMessage = handleError(
        'ChatService.fetchMessages',
        error,
        'Failed to fetch messages'
      );
      this.errorSignal.set(errorMessage);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Subscribe to realtime message updates for a specific conversation
   */
  subscribeToMessages(conversationId: string): void {
    this.pb
      .collection('messages')
      .subscribe<IMessage>(
        '*',
        async ({ action, record }) => {
          // Only handle messages for the current conversation
          if (record.conversation !== conversationId) return;

          if (action === 'create') {
            await this.handleMessageCreate(record);
          }

          if (action === 'update') {
            this.handleMessageUpdate(record);
          }

          if (action === 'delete') {
            this.handleMessageDelete(record);
          }
        },
        {
          filter: `conversation = "${conversationId}"`,
        }
      )
      .then((unsub: (() => void) | undefined) => {
        this.unsubscribe = unsub;
      })
      .catch((error) => {
        // Silently handle subscription errors
      });
  }

  /**
   * Unsubscribe from realtime updates
   */
  unsubscribeFromMessages(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  /**
   * Send a new message to a conversation
   */
  async sendMessage(conversationId: string, text: string): Promise<IMessage> {
    const currentUser = this.authService.user();

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    if (!text.trim()) {
      throw new Error('Message text cannot be empty');
    }

    try {
      // Check for block restrictions
      await this.checkBlockStatus(conversationId);

      const data = {
        text: text.trim(),
        user: currentUser.id,
        conversation: conversationId,
      };

      const createdMessage = await this.pb.collection('messages').create<IMessage>(data);

      // Update conversation's updated timestamp
      await this.pb.collection('conversations').update(conversationId, {
        updated: new Date().toISOString(),
      });

      return createdMessage;
    } catch (error: any) {
      const errorMessage = handleError('ChatService.sendMessage', error, 'Failed to send message');
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Send a file message with upload progress tracking
   */
  async sendFileMessage(
    conversationId: string,
    file: File,
    fileType: FileUploadType,
    onProgress?: (progress: number) => void
  ): Promise<IMessage> {
    const currentUser = this.authService.user();

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Check for block restrictions
      await this.checkBlockStatus(conversationId);

      // Create FormData with file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user', currentUser.id);
      formData.append('conversation', conversationId);
      formData.append('fileType', fileType);
      formData.append('fileName', file.name);
      formData.append('fileSize', file.size.toString());

      // Create XMLHttpRequest to track upload progress
      const createdMessage = await new Promise<IMessage>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        // Get PocketBase auth token
        const token = this.pb.authStore.token;
        xhr.open('POST', `${this.pb.baseURL}/api/collections/messages/records`);
        xhr.setRequestHeader('Authorization', token);
        xhr.send(formData);
      });

      // Update conversation's updated timestamp
      await this.pb.collection('conversations').update(conversationId, {
        updated: new Date().toISOString(),
      });

      return createdMessage;
    } catch (error: any) {
      const errorMessage = handleError('ChatService.sendFileMessage', error, 'Failed to send file');
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get file URL from PocketBase
   * Adds ?download=1 parameter to force browser download instead of preview
   */
  getFileUrl(message: IMessage, filename?: string): string {
    if (!message.file) return '';
    const baseUrl = this.pb.files.getURL(message, filename || message.file);
    // Add download parameter to force download instead of preview
    return `${baseUrl}?download=1`;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      await this.pb.collection('messages').delete(messageId);
    } catch (error: any) {
      const errorMessage = handleError(
        'ChatService.deleteMessage',
        error,
        'Failed to delete message'
      );
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Update a message
   */
  async updateMessage(messageId: string, text: string): Promise<IMessage> {
    try {
      const updatedMessage = await this.pb.collection('messages').update<IMessage>(messageId, {
        text: text.trim(),
      });

      return updatedMessage;
    } catch (error: any) {
      const errorMessage = handleError(
        'ChatService.updateMessage',
        error,
        'Failed to update message'
      );
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Clear all messages (local state only)
   */
  clearMessages(): void {
    this.messagesSignal.set([]);
  }

  /**
   * Handle message creation from realtime subscription
   */
  private async handleMessageCreate(record: any): Promise<void> {
    try {
      // Fetch associated user if not expanded
      if (!record.expand?.user) {
        const userRecord = await this.pb.collection('users').getOne(record.user);
        record.expand = {
          user: {
            id: userRecord.id,
            username: userRecord['username'],
            email: userRecord['email'],
            avatar: userRecord['avatar'],
          },
        };
      }

      const newMessage: IMessage = {
        id: record.id,
        text: record.text,
        user: record.user,
        conversation: record.conversation,
        file: record.file,
        fileType: record.fileType,
        fileName: record.fileName,
        fileSize: record.fileSize,
        thumbnail: record.thumbnail,
        created: record.created,
        updated: record.updated,
        expand: record.expand,
        // Ensure pb.files.getURL can generate a file URL immediately
        // (some PocketBase helpers expect collectionName/collectionId on the record)
        collectionId: 'messages',
        collectionName: 'messages',
      };

      // Check if message already exists (avoid duplicates)
      const exists = this.messagesSignal().some((m) => m.id === newMessage.id);
      if (!exists) {
        this.messagesSignal.update((prev) => [...prev, newMessage]);
      }
    } catch (error) {
      // Silently handle message creation errors
    }
  }

  /**
   * Handle message update from realtime subscription
   */
  private handleMessageUpdate(record: any): void {
    this.messagesSignal.update((prev) =>
      prev.map((m) =>
        m.id === record.id ? { ...m, text: record.text, updated: record.updated } : m
      )
    );
  }

  /**
   * Handle message deletion from realtime subscription
   */
  private handleMessageDelete(record: any): void {
    this.messagesSignal.update((prev) => prev.filter((m) => m.id !== record.id));
  }

  /**
   * Check if communication is blocked between current user and the other participant in the conversation
   * @param conversationId The conversation ID to check
   * @throws Error if blocked by either party
   */
  private async checkBlockStatus(conversationId: string): Promise<void> {
    const currentUser = this.authService.user();
    if (!currentUser) return;

    try {
      // Get the conversation to find the other participant
      const conversation = await this.conversationService.getConversationById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Find the other participant (not current user)
      const otherUserId = conversation.participants.find((id) => id !== currentUser.id);
      if (!otherUserId) {
        throw new Error('Cannot determine other participant');
      }

      // Check if current user has blocked the other user
      if (this.relationService.isBlockedByMe(otherUserId)) {
        throw new Error('You have blocked this user. Unblock them to send messages.');
      }

      // Check if other user has blocked current user
      if (this.relationService.isBlockedBy(otherUserId)) {
        throw new Error('This user has blocked you. You cannot send messages.');
      }
    } catch (error: any) {
      // Re-throw to prevent message sending
      throw error;
    }
  }
}
