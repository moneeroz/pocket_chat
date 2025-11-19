import { Component, input, inject, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RelationService } from '@/services/relation-service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMoreVertical, lucideShield, lucideShieldOff } from '@ng-icons/lucide';
import { HlmButtonImports } from '@shared/components/ui/button/src';

@Component({
  selector: 'app-relation-menu',
  standalone: true,
  imports: [CommonModule, NgIcon, HlmButtonImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      lucideMoreVertical,
      lucideShield,
      lucideShieldOff,
    }),
  ],
  template: `
    <div class="relative">
      <button
        hlmBtn
        variant="ghost"
        size="sm"
        class="h-8 w-8 p-0"
        (click)="toggleMenu()"
        [attr.title]="'Options'"
      >
        <ng-icon name="lucideMoreVertical" size="18" />
      </button>

      @if (isMenuOpen()) {
      <div
        class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
      >
        @if (relationStatus().type !== 'no_relation' && relationStatus().type !== 'pending_received') {
        <button
          hlmBtn
          variant="ghost"
          class="w-full justify-start px-4 py-2 text-sm rounded-none first:rounded-t-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          (click)="handleBlockToggle()"
          [disabled]="isLoading()"
        >
          <ng-icon
            [name]="relationStatus().type === 'blocked' && relationStatus().isInitiatedByMe
              ? 'lucideShieldOff'
              : 'lucideShield'"
            size="16"
            class="mr-2"
          />
          {{
            relationStatus().type === 'blocked' && relationStatus().isInitiatedByMe
              ? 'Unblock User'
              : 'Block User'
          }}
        </button>
        }
      </div>
      }
    </div>
  `,
})
export class RelationMenuComponent {
  readonly userId = input.required<string>();

  private readonly relationService = inject(RelationService);
  private readonly isMenuOpenSignal = signal(false);
  private readonly isLoadingSignal = signal(false);

  protected readonly isMenuOpen = this.isMenuOpenSignal.asReadonly();
  protected readonly isLoading = this.isLoadingSignal.asReadonly();
  protected readonly relationStatus = computed(() =>
    this.relationService.getRelationStatus(this.userId())
  );

  toggleMenu(): void {
    this.isMenuOpenSignal.update((val) => !val);
  }

  closeMenu(): void {
    this.isMenuOpenSignal.set(false);
  }

  async handleBlockToggle(): Promise<void> {
    const status = this.relationStatus();
    const userId = this.userId();

    this.isLoadingSignal.set(true);

    try {
      if (status.type === 'blocked' && status.isInitiatedByMe) {
        await this.relationService.unblockUser(userId);
      } else {
        await this.relationService.blockUser(userId);
      }
      this.closeMenu();
    } catch (error: any) {
      console.error('Block action failed:', error.message);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }
}
