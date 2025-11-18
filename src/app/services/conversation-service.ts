import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth-service';
import { IConversation } from '@shared/interfaces/iconversation';
import { IAuthUser } from '@shared/interfaces/iauth-user';

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  private readonly authService = inject(AuthService);
  private readonly pb = this.authService.getPocketBase();

  // Signals for reactive state
  private readonly conversationsSignal = signal<IConversation[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  // Public readonly signals
  readonly conversations = this.conversationsSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  private unsubscribe?: () => void;

  /**
   * Fetch all conversations for the current user
   */
  async fetchConversations(): Promise<void> {
    const currentUser = this.authService.user();
    if (!currentUser) return;

    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      // Fetch conversations where current user is a participant
      const resultList = await this.pb.collection('conversations').getList<IConversation>(1, 50, {
        filter: `participants ~ "${currentUser.id}"`,
        sort: '-updated',
        expand: 'participants',
      });

      this.conversationsSignal.set(resultList.items);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to fetch conversations';
      this.errorSignal.set(errorMessage);
      console.error('Failed to fetch conversations:', error);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get or create a conversation between current user and another user
   */
  async getOrCreateConversation(otherUserId: string): Promise<IConversation> {
    const currentUser = this.authService.user();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Check if conversation already exists
      const existingConversations = await this.pb
        .collection('conversations')
        .getList<IConversation>(1, 1, {
          filter: `participants ~ "${currentUser.id}" && participants ~ "${otherUserId}"`,
          expand: 'participants',
        });

      if (existingConversations.items.length > 0) {
        return existingConversations.items[0];
      }

      // Create new conversation
      const newConversation = await this.pb.collection('conversations').create<IConversation>(
        {
          participants: [currentUser.id, otherUserId],
        },
        {
          expand: 'participants',
        }
      );

      // Add to local state
      this.conversationsSignal.update((prev) => [newConversation, ...prev]);

      return newConversation;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to create conversation';
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Search for users by username
   */
  async searchUsers(query: string): Promise<IAuthUser[]> {
    const currentUser = this.authService.user();
    if (!currentUser) return [];

    try {
      if (!query.trim()) return [];

      const resultList = await this.pb.collection('users').getList(1, 10, {
        filter: `username ~ "${query}" && id != "${currentUser.id}"`,
      });

      return resultList.items.map((record) => ({
        id: record.id,
        email: record['email'],
        username: record['username'],
        avatar: record['avatar'],
      }));
    } catch (error: any) {
      console.error('Failed to search users:', error);
      return [];
    }
  }

  /**
   * Get the other participant in a conversation
   */
  getOtherParticipant(conversation: IConversation): IAuthUser | null {
    const currentUser = this.authService.user();
    if (!currentUser || !conversation.expand?.participants) return null;

    const otherParticipant = conversation.expand.participants.find((p) => p.id !== currentUser.id);

    return otherParticipant || null;
  }

  /**
   * Subscribe to realtime conversation updates
   */
  subscribeToConversations(): void {
    const currentUser = this.authService.user();
    if (!currentUser) return;

    this.pb
      .collection('conversations')
      .subscribe<IConversation>('*', async ({ action, record }) => {
        // Only handle conversations where current user is a participant
        if (!record.participants.includes(currentUser.id)) return;

        if (action === 'create' || action === 'update') {
          await this.handleConversationCreateOrUpdate(record);
        }

        if (action === 'delete') {
          this.handleConversationDelete(record);
        }
      })
      .then((unsub: (() => void) | undefined) => {
        this.unsubscribe = unsub;
      })
      .catch((error) => {
        console.error('Failed to subscribe to conversations:', error);
      });
  }

  /**
   * Unsubscribe from realtime updates
   */
  unsubscribeFromConversations(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  /**
   * Handle conversation create/update from realtime
   */
  private async handleConversationCreateOrUpdate(record: any): Promise<void> {
    try {
      // Fetch with expanded participants
      const fullRecord = await this.pb
        .collection('conversations')
        .getOne<IConversation>(record.id, {
          expand: 'participants',
        });

      this.conversationsSignal.update((prev) => {
        const exists = prev.some((c) => c.id === fullRecord.id);
        if (exists) {
          return prev.map((c) => (c.id === fullRecord.id ? fullRecord : c));
        } else {
          return [fullRecord, ...prev];
        }
      });
    } catch (error) {
      console.error('Failed to handle conversation update:', error);
    }
  }

  /**
   * Handle conversation deletion from realtime
   */
  private handleConversationDelete(record: any): void {
    this.conversationsSignal.update((prev) => prev.filter((c) => c.id !== record.id));
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId: string): Promise<IConversation | null> {
    try {
      const conversation = await this.pb
        .collection('conversations')
        .getOne<IConversation>(conversationId, {
          expand: 'participants',
        });
      return conversation;
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      return null;
    }
  }
}
