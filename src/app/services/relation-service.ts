import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth-service';
import { IRelation, IRelationStatus, RelationType } from '@shared/interfaces/irelation';
import { handleError } from '@shared/utils/error.utils';
import {
  RELATION_ERRORS,
  RELATION_TIMINGS,
} from '@shared/constants/app.constants';

@Injectable({
  providedIn: 'root',
})
export class RelationService {
  private readonly authService = inject(AuthService);
  private readonly pb = this.authService.getPocketBase();

  // Signals for reactive state
  private readonly relationsSignal = signal<IRelation[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  // Public readonly signals
  readonly relations = this.relationsSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // Computed: friends only (both directions)
  readonly friends = computed(() => {
    const currentUser = this.authService.user();
    if (!currentUser) return [];
    const relations = this.relationsSignal();
    return relations.filter(
      (r) =>
        r.type === 'friend' &&
        (r.from_user === currentUser.id || r.to_user === currentUser.id)
    );
  });

  // Computed: pending friend requests sent by me
  readonly pendingRequestsSent = computed(() => {
    const currentUser = this.authService.user();
    if (!currentUser) return [];
    return this.relationsSignal().filter(
      (r) => r.from_user === currentUser.id && r.type === 'pending_sent'
    );
  });

  // Computed: pending friend requests received by me
  readonly pendingRequestsReceived = computed(() => {
    const currentUser = this.authService.user();
    if (!currentUser) return [];
    return this.relationsSignal().filter(
      (r) => r.from_user !== currentUser.id && r.to_user === currentUser.id && r.type === 'pending_sent'
    );
  });

  // Computed: count of pending friend requests received
  readonly pendingRequestCount = computed(() => {
    return this.pendingRequestsReceived().length;
  });

  // Computed: blocked users
  readonly blockedUsers = computed(() => {
    const currentUser = this.authService.user();
    if (!currentUser) return [];
    return this.relationsSignal().filter((r) => r.from_user === currentUser.id && r.type === 'blocked');
  });

  private unsubscribe?: () => void;
  private initialized = false;
  private processingIds = new Set<string>(); // Prevent duplicate event processing

  constructor() {
    // Auto-load relations when user is authenticated
    this.authService.isAuthenticated;
    this.initializeRelations();
  }

  /**
   * Initialize relations on service creation
   * Loads relations and subscribes to real-time updates
   */
  private initializeRelations(): void {
    // Watch for authentication changes
    const checkAuth = setInterval(() => {
      const user = this.authService.user();
      if (user && !this.initialized) {
        this.initialized = true;
        clearInterval(checkAuth);
        
        // Load initial relations
        this.fetchRelations().then(() => {
          // Subscribe to real-time updates
          this.subscribeToRelations();
        });
      }
    }, 100);
  }

  /**
   * Fetch all relations for the current user (both incoming and outgoing)
   */
  async fetchRelations(): Promise<void> {
    const currentUser = this.authService.user();
    if (!currentUser) return;

    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      // Fetch all relations where user is either from_user or to_user
      const resultList = await this.pb.collection('relations').getList<IRelation>(1, 1000, {
        filter: `from_user = "${currentUser.id}" || to_user = "${currentUser.id}"`,
        expand: 'from_user,to_user',
        sort: '-created',
      });

      // Simply set the relations - the subscription handles real-time updates
      this.relationsSignal.set(resultList.items);
    } catch (error: any) {
      const errorMessage = handleError(
        'RelationService.fetchRelations',
        error,
        'Failed to fetch relations'
      );
      this.errorSignal.set(errorMessage);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get relation status between current user and another user
   * Returns computed status considering both directions
   */
  getRelationStatus(userId: string): IRelationStatus {
    const currentUser = this.authService.user();
    if (!currentUser) {
      return { type: 'no_relation', isInitiatedByMe: false };
    }

    const relations = this.relationsSignal();

    // Check outgoing relation (from current user)
    const outgoing = relations.find(
      (r) => r.from_user === currentUser.id && r.to_user === userId
    );
    if (outgoing) {
      return {
        type: outgoing.type,
        isInitiatedByMe: true,
        relation: outgoing,
      };
    }

    // Check incoming relation (to current user)
    const incoming = relations.find(
      (r) => r.from_user === userId && r.to_user === currentUser.id
    );
    if (incoming) {
      // Convert pending_sent to pending_received for the receiving user
      const type = incoming.type === 'pending_sent' ? 'pending_received' : incoming.type;
      return {
        type: type as RelationType,
        isInitiatedByMe: false,
        relation: incoming,
      };
    }

    return { type: 'no_relation', isInitiatedByMe: false };
  }

  /**
   * Get relation status from database (more reliable than signal)
   * Useful for initial checks where signal might be out of sync
   */
  async getRelationStatusFromDB(userId: string): Promise<IRelationStatus> {
    const currentUser = this.authService.user();
    if (!currentUser) {
      return { type: 'no_relation', isInitiatedByMe: false };
    }

    try {
      // Check outgoing relation
      const outgoingList = await this.pb.collection('relations').getList<IRelation>(1, 1, {
        filter: `from_user = "${currentUser.id}" && to_user = "${userId}"`,
      });

      if (outgoingList.items.length > 0) {
        const outgoing = outgoingList.items[0];
        return {
          type: outgoing.type,
          isInitiatedByMe: true,
          relation: outgoing,
        };
      }

      // Check incoming relation
      const incomingList = await this.pb.collection('relations').getList<IRelation>(1, 1, {
        filter: `from_user = "${userId}" && to_user = "${currentUser.id}"`,
      });

      if (incomingList.items.length > 0) {
        const incoming = incomingList.items[0];
        const type = incoming.type === 'pending_sent' ? 'pending_received' : incoming.type;
        return {
          type: type as RelationType,
          isInitiatedByMe: false,
          relation: incoming,
        };
      }

      return { type: 'no_relation', isInitiatedByMe: false };
    } catch (error) {
      return { type: 'no_relation', isInitiatedByMe: false };
    }
  }
  async sendFriendRequest(targetUserId: string): Promise<IRelation> {
    const currentUser = this.authService.user();

    if (!currentUser) {
      throw new Error(RELATION_ERRORS.not_authenticated);
    }

    if (currentUser.id === targetUserId) {
      throw new Error(RELATION_ERRORS.cannot_relate_self);
    }

    // Check existing relation
    const status = this.getRelationStatus(targetUserId);
    if (status.type !== 'no_relation') {
      throw new Error(`Cannot send request: user status is ${status.type}`);
    }

    try {
      const data = {
        from_user: currentUser.id,
        to_user: targetUserId,
        type: 'pending_sent',
      };

      const relation = await this.pb.collection('relations').create<IRelation>(data, {
        expand: 'from_user,to_user',
      });

      // Update local state
      this.relationsSignal.update((prev) => [...prev, relation]);

      return relation;
    } catch (error: any) {
      const errorMessage = handleError(
        'RelationService.sendFriendRequest',
        error,
        'Failed to send friend request'
      );
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Accept a pending friend request
   * This converts a `pending_received` relation to `friend` for both users
   * 
   * BACKEND PERMISSION REQUIREMENT:
   * The 'update' permission in PocketBase relations collection must be:
   * from_user.id = @request.auth.id || to_user.id = @request.auth.id
   * 
   * This allows the receiving user (to_user) to accept the request by updating the relation.
   */
  async acceptFriendRequest(targetUserId: string): Promise<void> {
    const currentUser = this.authService.user();

    if (!currentUser) {
      throw new Error(RELATION_ERRORS.not_authenticated);
    }

    const status = this.getRelationStatus(targetUserId);

    // Must be pending_received to accept
    if (status.type !== 'pending_received' || !status.relation) {
      throw new Error('No pending friend request from this user');
    }

    try {
      const incomingRelationId = status.relation.id;

      // Update the incoming relation to friend type
      // This requires the backend permission: from_user.id = @request.auth.id || to_user.id = @request.auth.id
      const updatedRelation = await this.pb.collection('relations').update<IRelation>(
        incomingRelationId,
        { type: 'friend' },
        { expand: 'from_user,to_user' }
      );

      // Update local state immediately with the updated relation
      this.relationsSignal.update((prev) =>
        prev.map((r) => (r.id === incomingRelationId ? updatedRelation : r))
      );

      // Create or update reciprocal relation
      const outgoingRelation = this.relationsSignal().find(
        (r) => r.from_user === currentUser.id && r.to_user === targetUserId
      );

      if (outgoingRelation) {
        // Update existing reciprocal to friend
        await this.pb.collection('relations').update<IRelation>(
          outgoingRelation.id,
          { type: 'friend' },
          { expand: 'from_user,to_user' }
        );
      } else {
        // Create reciprocal friend relation
        await this.pb.collection('relations').create<IRelation>(
          {
            from_user: currentUser.id,
            to_user: targetUserId,
            type: 'friend',
          },
          { expand: 'from_user,to_user' }
        );
      }

      // Refresh relations to ensure UI stays in sync
      await this.fetchRelations();
    } catch (error: any) {
      const errorMessage = handleError(
        'RelationService.acceptFriendRequest',
        error,
        'Failed to accept friend request. This may be due to insufficient backend permissions.'
      );
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Reject a pending friend request
   */
  async rejectFriendRequest(targetUserId: string): Promise<void> {
    const currentUser = this.authService.user();

    if (!currentUser) {
      throw new Error(RELATION_ERRORS.not_authenticated);
    }

    const status = this.getRelationStatus(targetUserId);

    if (status.type !== 'pending_received' || !status.relation) {
      throw new Error('No pending friend request from this user');
    }

    try {
      await this.pb.collection('relations').delete(status.relation.id);

      // Update local state
      this.relationsSignal.update((prev) =>
        prev.filter((r) => r.id !== status.relation?.id)
      );
    } catch (error: any) {
      const errorMessage = handleError(
        'RelationService.rejectFriendRequest',
        error,
        'Failed to reject friend request'
      );
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Cancel a friend request sent by current user
   */
  async cancelFriendRequest(targetUserId: string): Promise<void> {
    const currentUser = this.authService.user();

    if (!currentUser) {
      throw new Error(RELATION_ERRORS.not_authenticated);
    }

    const status = this.getRelationStatus(targetUserId);

    if (status.type !== 'pending_sent' || !status.relation) {
      throw new Error('No outgoing friend request to this user');
    }

    try {
      await this.pb.collection('relations').delete(status.relation.id);

      // Update local state
      this.relationsSignal.update((prev) =>
        prev.filter((r) => r.id !== status.relation?.id)
      );
    } catch (error: any) {
      const errorMessage = handleError(
        'RelationService.cancelFriendRequest',
        error,
        'Failed to cancel friend request'
      );
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Remove a friend (delete both directions of the friendship)
   */
  async removeFriend(targetUserId: string): Promise<void> {
    const currentUser = this.authService.user();

    if (!currentUser) {
      throw new Error(RELATION_ERRORS.not_authenticated);
    }

    const status = this.getRelationStatus(targetUserId);

    if (status.type !== 'friend' || !status.relation) {
      throw new Error('User is not your friend');
    }

    try {
      // Delete the relation
      await this.pb.collection('relations').delete(status.relation.id);

      // Also delete reciprocal if exists
      const reciprocal = this.relationsSignal().find(
        (r) => r.from_user === targetUserId && r.to_user === currentUser.id && r.type === 'friend'
      );

      if (reciprocal) {
        await this.pb.collection('relations').delete(reciprocal.id);
      }

      // Update local state
      this.relationsSignal.update((prev) =>
        prev.filter(
          (r) =>
            !(
              (r.id === status.relation?.id ||
                (reciprocal && r.id === reciprocal.id)) &&
              r.type === 'friend'
            )
        )
      );
    } catch (error: any) {
      const errorMessage = handleError(
        'RelationService.removeFriend',
        error,
        'Failed to remove friend'
      );
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Block a user (prevents communication and visibility)
   * Auto-removes friendship if it exists
   */
  async blockUser(targetUserId: string): Promise<IRelation> {
    const currentUser = this.authService.user();

    if (!currentUser) {
      throw new Error(RELATION_ERRORS.not_authenticated);
    }

    if (currentUser.id === targetUserId) {
      throw new Error(RELATION_ERRORS.cannot_relate_self);
    }

    try {
      // Auto-remove friendship if exists (clean state)
      if (this.areFriends(targetUserId)) {
        await this.removeFriend(targetUserId);
      }

      const status = this.getRelationStatus(targetUserId);

      // If already blocked, nothing to do
      if (status.type === 'blocked' && status.isInitiatedByMe) {
        throw new Error(RELATION_ERRORS.already_blocked);
      }

      let blockedRelation: IRelation;

      if (status.type === 'blocked' && !status.isInitiatedByMe) {
        // They blocked us; we can also block them
        blockedRelation = await this.pb.collection('relations').create<IRelation>(
          {
            from_user: currentUser.id,
            to_user: targetUserId,
            type: 'blocked',
          },
          { expand: 'from_user,to_user' }
        );
      } else if (status.relation) {
        // Update existing relation to blocked
        blockedRelation = await this.pb.collection('relations').update<IRelation>(
          status.relation.id,
          {
            type: 'blocked',
          }
        );
      } else {
        // Create new blocked relation
        blockedRelation = await this.pb.collection('relations').create<IRelation>(
          {
            from_user: currentUser.id,
            to_user: targetUserId,
            type: 'blocked',
          },
          { expand: 'from_user,to_user' }
        );
      }

      // Update local state
      if (status.relation) {
        this.relationsSignal.update((prev) =>
          prev.map((r) => (r.id === status.relation?.id ? blockedRelation : r))
        );
      } else {
        this.relationsSignal.update((prev) => [...prev, blockedRelation]);
      }

      return blockedRelation;
    } catch (error: any) {
      const errorMessage = handleError(
        'RelationService.blockUser',
        error,
        'Failed to block user'
      );
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(targetUserId: string): Promise<void> {
    const currentUser = this.authService.user();

    if (!currentUser) {
      throw new Error(RELATION_ERRORS.not_authenticated);
    }

    const status = this.getRelationStatus(targetUserId);

    if (status.type !== 'blocked' || !status.isInitiatedByMe || !status.relation) {
      throw new Error('User is not blocked by you');
    }

    try {
      await this.pb.collection('relations').delete(status.relation.id);

      // Update local state
      this.relationsSignal.update((prev) =>
        prev.filter((r) => r.id !== status.relation?.id)
      );
    } catch (error: any) {
      const errorMessage = handleError(
        'RelationService.unblockUser',
        error,
        'Failed to unblock user'
      );
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Subscribe to realtime relation updates
   */
  subscribeToRelations(): void {
    const currentUser = this.authService.user();
    if (!currentUser) return;

    this.pb
      .collection('relations')
      .subscribe<IRelation>(
        '*',
        async ({ action, record }) => {
          // Only handle relations where current user is involved
          if (
            record.from_user !== currentUser.id &&
            record.to_user !== currentUser.id
          ) {
            return;
          }

          if (action === 'create') {
            await this.handleRelationCreate(record);
          }

          if (action === 'update') {
            await this.handleRelationUpdate(record);
          }

          if (action === 'delete') {
            this.handleRelationDelete(record);
          }
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
  unsubscribeFromRelations(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  /**
   * Handle relation creation from realtime subscription
   */
  private async handleRelationCreate(record: any): Promise<void> {
    // Skip if already processing this ID (debounce duplicate events)
    if (this.processingIds.has(record.id)) {
      return;
    }

    this.processingIds.add(record.id);

    try {
      // Fetch full record with expanded user data if missing
      if (!record.expand?.from_user || !record.expand?.to_user) {
        try {
          record = await this.pb.collection('relations').getOne<IRelation>(record.id, {
            expand: 'from_user,to_user',
          });
        } catch (error) {
          // Could not fetch expanded relation, continue with available data
        }
      }

      // Add to relations signal if not already present
      const exists = this.relationsSignal().some((r) => r.id === record.id);
      if (!exists) {
        this.relationsSignal.update((prev) => [...prev, record]);
      }
    } finally {
      this.processingIds.delete(record.id);
    }
  }

  /**
   * Handle relation update from realtime subscription
   */
  private async handleRelationUpdate(record: any): Promise<void> {
    // Fetch full record with expanded user data if missing
    if (!record.expand?.from_user || !record.expand?.to_user) {
      try {
        record = await this.pb.collection('relations').getOne<IRelation>(record.id, {
          expand: 'from_user,to_user',
        });
      } catch (error) {
        // Could not fetch expanded relation for update, continue with available data
      }
    }

    // Update existing relation
    this.relationsSignal.update((prev) =>
      prev.map((r) =>
        r.id === record.id
          ? {
              ...r,
              type: record.type,
              updated: record.updated,
              expand: record.expand || r.expand,
            }
          : r
      )
    );
  }

  /**
   * Handle relation deletion from realtime subscription
   */
  private handleRelationDelete(record: any): void {
    this.relationsSignal.update((prev) => prev.filter((r) => r.id !== record.id));
  }

  /**
   * Check if current user has blocked another user
   */
  isBlockedByMe(userId: string): boolean {
    const status = this.getRelationStatus(userId);
    return status.type === 'blocked' && status.isInitiatedByMe;
  }

  /**
   * Check if current user is blocked by another user
   */
  isBlockedBy(userId: string): boolean {
    const status = this.getRelationStatus(userId);
    return status.type === 'blocked' && !status.isInitiatedByMe;
  }

  /**
   * Check if users are friends
   */
  areFriends(userId: string): boolean {
    const status = this.getRelationStatus(userId);
    return status.type === 'friend';
  }
}
