import { Component, inject, output, input } from '@angular/core';
import { ConversationService } from '@/services/conversation-service';
import { AuthService } from '@/services/auth-service';
import { IConversation } from '@shared/interfaces/iconversation';
import { formatConversationTime } from '@shared/utils/date.utils';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMessageCircle } from '@ng-icons/lucide';
import { HlmAvatarImports } from '@shared/components/ui/avatar/src';

@Component({
  selector: 'app-conversation-list',
  imports: [NgIcon, HlmAvatarImports],
  viewProviders: [
    provideIcons({
      lucideMessageCircle,
    }),
  ],
  templateUrl: './conversation-list.html',
})
export class ConversationList {
  private readonly conversationService = inject(ConversationService);
  private readonly authService = inject(AuthService);

  readonly conversationSelected = output<IConversation>();
  readonly selectedConversationId = input<string | null>(null);

  protected readonly conversations = this.conversationService.conversations;
  protected readonly isLoading = this.conversationService.isLoading;

  selectConversation(conversation: IConversation): void {
    this.conversationSelected.emit(conversation);
  }

  getOtherParticipant(conversation: IConversation) {
    return this.conversationService.getOtherParticipant(conversation);
  }

  getAvatarUrl(conversation: IConversation): string {
    const participant = this.getOtherParticipant(conversation);
    return this.authService.getAvatarUrl(participant);
  }

  getDisplayName(conversation: IConversation): string {
    const otherParticipant = this.getOtherParticipant(conversation);
    return otherParticipant?.username || otherParticipant?.email || 'Unknown User';
  }

  getInitial(conversation: IConversation): string {
    const name = this.getDisplayName(conversation);
    return name.charAt(0).toUpperCase();
  }

  getFormattedTime(conversation: IConversation): string {
    return formatConversationTime(conversation.updated);
  }
}
