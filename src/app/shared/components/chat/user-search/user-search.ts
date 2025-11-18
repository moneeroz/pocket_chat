import { Component, inject, signal, output, OnDestroy } from '@angular/core';
import { ConversationService } from '@/services/conversation-service';
import { AuthService } from '@/services/auth-service';
import { IAuthUser } from '@shared/interfaces/iauth-user';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideX } from '@ng-icons/lucide';
import { HlmAvatarImports } from '@shared/components/ui/avatar/src';
import { DEBOUNCE_DURATIONS } from '@shared/constants/app.constants';
import { HlmInput } from "@shared/components/ui/input/src";

@Component({
  selector: 'app-user-search',
  imports: [FormsModule, NgIcon, HlmAvatarImports, HlmInput],
  viewProviders: [
    provideIcons({
      lucideSearch,
      lucideX,
    }),
  ],
  templateUrl: './user-search.html',
})
export class UserSearch implements OnDestroy {
  private readonly conversationService = inject(ConversationService);
  private readonly authService = inject(AuthService);

  readonly userSelected = output<IAuthUser>();

  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<IAuthUser[]>([]);
  protected readonly isSearching = signal(false);
  private searchTimeout: number | null = null;

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
  }
}
