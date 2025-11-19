import { Component, computed, inject, signal } from '@angular/core';
import { RelationService } from '@/services/relation-service';
import { Location } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideTrash2, lucideShieldOff } from '@ng-icons/lucide';
import { HlmCardImports } from '@shared/components/ui/card/src';
import { HlmButtonImports } from '@shared/components/ui/button/src';
import { HlmAvatarImports } from '@shared/components/ui/avatar/src';
import { RelationActionButtonComponent } from '@shared/components/chat/relation-action-button/relation-action-button';

@Component({
  selector: 'app-friends',
  imports: [
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmAvatarImports,
    RelationActionButtonComponent,
  ],
  viewProviders: [
    provideIcons({
      lucideArrowLeft,
      lucideTrash2,
      lucideShieldOff,
    }),
  ],
  templateUrl: './friends.html',
})
export class Friends {
  private readonly relationService = inject(RelationService);
  private readonly location = inject(Location);

  protected readonly isLoading = signal(false);

  // Computed signal for pending friend requests received
  protected readonly pendingRequests = computed(() => {
    return this.relationService.pendingRequestsReceived();
  });

  // Computed signal for blocked users
  protected readonly blockedUsers = computed(() => {
    return this.relationService.blockedUsers();
  });

  goBack(): void {
    this.location.back();
  }

  async rejectFriendRequest(userId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.relationService.rejectFriendRequest(userId);
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async unblockUser(userId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.relationService.unblockUser(userId);
    } catch (error) {
      console.error('Failed to unblock user:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
