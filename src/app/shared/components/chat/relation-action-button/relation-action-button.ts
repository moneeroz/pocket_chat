import { Component, input, inject, ChangeDetectionStrategy, computed, signal, OnInit } from '@angular/core';
import { RelationService } from '@/services/relation-service';
import { IRelationStatus } from '@shared/interfaces/irelation';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideUserPlus,
  lucideUserCheck,
  lucideUserX,
  lucideShield,
  lucideShieldOff,
  lucideHourglass,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@shared/components/ui/button/src';

@Component({
  selector: 'app-relation-action-button',
  standalone: true,
  imports: [NgIcon, HlmButtonImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      lucideUserPlus,
      lucideUserCheck,
      lucideUserX,
      lucideShield,
      lucideShieldOff,
      lucideHourglass,
    }),
  ],
  template: `
    <button
      hlmBtn
      [variant]="buttonVariant()"
      [size]="size()"
      [disabled]="isLoading()"
      (click)="handleAction()"
      class="gap-2 transition-all"
      [attr.title]="tooltipText()"
    >
      <ng-icon [name]="iconName()" size="18" />
      <span class="hidden sm:inline">{{ buttonLabel() }}</span>
    </button>
  `,
})
export class RelationActionButtonComponent implements OnInit {
  readonly userId = input.required<string>();
  readonly size = input<'default' | 'sm' | 'lg'>('default');

  private readonly relationService = inject(RelationService);
  private readonly isLoadingSignal = signal(false);
  private readonly relationStatusSignal = signal<IRelationStatus>({ type: 'no_relation', isInitiatedByMe: false });

  protected readonly isLoading = this.isLoadingSignal.asReadonly();
  protected readonly relationStatus = this.relationStatusSignal.asReadonly();

  async ngOnInit(): Promise<void> {
    // Load relation status from database (more reliable than signal at initial load)
    const status = await this.relationService.getRelationStatusFromDB(this.userId());
    this.relationStatusSignal.set(status);
  }

  protected readonly buttonLabel = computed(() => {
    const status = this.relationStatus();
    switch (status.type) {
      case 'no_relation':
        return 'Add Friend';
      case 'pending_sent':
        return 'Pending';
      case 'pending_received':
        return 'Accept';
      case 'friend':
        return 'Remove';
      case 'blocked':
        return status.isInitiatedByMe ? 'Unblock' : 'Blocked';
      default:
        return 'Add Friend';
    }
  });

  protected readonly iconName = computed(() => {
    const status = this.relationStatus();
    switch (status.type) {
      case 'no_relation':
        return 'lucideUserPlus';
      case 'pending_sent':
        return 'lucideHourglass';
      case 'pending_received':
        return 'lucideUserCheck';
      case 'friend':
        return 'lucideUserX';
      case 'blocked':
        return status.isInitiatedByMe ? 'lucideShieldOff' : 'lucideShield';
      default:
        return 'lucideUserPlus';
    }
  });

  protected readonly buttonVariant = computed(() => {
    const status = this.relationStatus();
    switch (status.type) {
      case 'no_relation':
        return 'default';
      case 'pending_sent':
        return 'outline';
      case 'pending_received':
        return 'default';
      case 'friend':
        return 'outline';
      case 'blocked':
        return status.isInitiatedByMe ? 'secondary' : 'ghost';
      default:
        return 'default';
    }
  });

  protected readonly tooltipText = computed(() => {
    const status = this.relationStatus();
    switch (status.type) {
      case 'no_relation':
        return 'Send friend request';
      case 'pending_sent':
        return 'Friend request pending';
      case 'pending_received':
        return 'Click to accept friend request';
      case 'friend':
        return 'Remove from friends';
      case 'blocked':
        return status.isInitiatedByMe ? 'Unblock user' : 'User has blocked you';
      default:
        return '';
    }
  });

  async handleAction(): Promise<void> {
    const status = this.relationStatus();
    const userId = this.userId();

    this.isLoadingSignal.set(true);

    try {
      switch (status.type) {
        case 'no_relation':
          await this.relationService.sendFriendRequest(userId);
          break;

        case 'pending_sent':
          await this.relationService.cancelFriendRequest(userId);
          break;

        case 'pending_received':
          await this.relationService.acceptFriendRequest(userId);
          break;

        case 'friend':
          await this.relationService.removeFriend(userId);
          break;

        case 'blocked':
          if (status.isInitiatedByMe) {
            await this.relationService.unblockUser(userId);
          }
          break;
      }
      
      // Refresh relations to ensure UI stays in sync
      await this.relationService.fetchRelations();
      
      // Re-query status from database to update the button UI immediately
      const updatedStatus = await this.relationService.getRelationStatusFromDB(userId);
      this.relationStatusSignal.set(updatedStatus);
    } catch (error: any) {
      console.error('Relation action failed:', error.message);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }
}
