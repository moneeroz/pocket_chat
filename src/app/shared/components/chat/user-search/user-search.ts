import { Component, inject, signal, output, OnDestroy, OnInit } from '@angular/core';
import { ConversationService } from '@/services/conversation-service';
import { AuthService } from '@/services/auth-service';
import { RelationService } from '@/services/relation-service';
import { IAuthUser } from '@shared/interfaces/iauth-user';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideX, lucideLock } from '@ng-icons/lucide';
import { HlmAvatarImports } from '@shared/components/ui/avatar/src';
import { DEBOUNCE_DURATIONS } from '@shared/constants/app.constants';
import { HlmInput } from "@shared/components/ui/input/src";
import { RelationActionButtonComponent } from '../relation-action-button/relation-action-button';

@Component({
  selector: 'app-user-search',
  imports: [FormsModule, NgIcon, HlmAvatarImports, HlmInput, RelationActionButtonComponent],
  viewProviders: [
    provideIcons({
      lucideSearch,
      lucideX,
      lucideLock,
    }),
  ],
  templateUrl: './user-search.html',
})
export class UserSearch implements OnInit, OnDestroy {
  private readonly conversationService = inject(ConversationService);
  private readonly authService = inject(AuthService);
  private readonly relationService = inject(RelationService);

  readonly userSelected = output<IAuthUser>();

  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<IAuthUser[]>([]);
  protected readonly isSearching = signal(false);
  protected readonly selectedUserId = signal<string | null>(null);
  private searchTimeout: number | null = null;

  /**
   * Get relation status for a user - used in template to check if friends
   */
  protected getFriendStatus = (userId: string) => this.relationService.getRelationStatus(userId);

  ngOnInit(): void {
    // Relations are already loaded and subscribed to in RelationService constructor
    // No need to call again - this was causing duplicate fetches that overwrote subscription data
    // this.relationService.fetchRelations();
    // this.relationService.subscribeToRelations();
  }

  async onSearchInput(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const query = input.value;
    this.searchQuery.set(query);

    // Clear any pending search
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }

    if (query.trim().length < 2) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }

    // Show loading state immediately
    this.isSearching.set(true);

    // Debounce the actual search
    this.searchTimeout = setTimeout(async () => {
      const results = await this.conversationService.searchUsers(query);
      this.searchResults.set(results);
      this.isSearching.set(false);
      this.searchTimeout = null;
    }, DEBOUNCE_DURATIONS.search);
  }

  selectUser(user: IAuthUser): void {
    const friendStatus = this.relationService.getRelationStatus(user.id);
    
    // Only allow chat if users are friends
    if (friendStatus.type !== 'friend') {
      this.selectedUserId.set(user.id);
      return;
    }
    
    this.userSelected.emit(user);
    this.clearSearch();
  }

  clearSearch(): void {
    // Clear any pending search
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.isSearching.set(false);
  }

  getAvatarUrl(user: IAuthUser): string {
    return this.authService.getAvatarUrl(user);
  }

  ngOnDestroy(): void {
    // Clean up pending timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    // Unsubscribe from relations
    this.relationService.unsubscribeFromRelations();
  }
}
