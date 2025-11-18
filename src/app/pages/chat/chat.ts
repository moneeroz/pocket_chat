import { Component, effect, ElementRef, inject, viewChild, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AuthService } from '@/services/auth-service';
import { ChatService } from '@/services/chat-service';
import { ConversationService } from '@/services/conversation-service';
import { MessageBody } from '@shared/components/chat/message-body/message-body';
import { NewMessage } from '@shared/components/chat/new-message/new-message';
import { UserSearch } from '@shared/components/chat/user-search/user-search';
import { ConversationList } from '@shared/components/chat/conversation-list/conversation-list';
import { IConversation } from '@shared/interfaces/iconversation';
import { IAuthUser } from '@shared/interfaces/iauth-user';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoader, lucideChevronLeft } from '@ng-icons/lucide';
import { HlmAvatarImports } from '@shared/components/ui/avatar/src';
import { HlmButtonImports } from '@shared/components/ui/button/src';
import { SCROLL_TO_BOTTOM_DELAY } from '@shared/constants/app.constants';

@Component({
  selector: 'app-chat',
  imports: [
    MessageBody,
    NewMessage,
    UserSearch,
    ConversationList,
    NgIcon,
    HlmAvatarImports,
    HlmButtonImports,
  ],
  viewProviders: [
    provideIcons({
      lucideLoader,
      lucideChevronLeft,
    }),
  ],
  templateUrl: './chat.html',
})
export class Chat implements OnDestroy {
  readonly chatService = inject(ChatService);
  readonly conversationService = inject(ConversationService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Scroll anchor reference
  private readonly scrollAnchor = viewChild<ElementRef<HTMLDivElement>>('scrollAnchor');

  // Current active conversation
  protected readonly currentConversation = signal<IConversation | null>(null);

  // Convert route params to signal
  private readonly conversationIdFromRoute = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('conversationId')))
  );

  constructor() {
    // Fetch conversations on init
    this.conversationService.fetchConversations();
    this.conversationService.subscribeToConversations();

    // Watch for conversation ID in URL params (reactive to route changes)
    effect(() => {
      const conversations = this.conversationService.conversations();
      const conversationId = this.conversationIdFromRoute();

      if (conversationId && conversations.length > 0) {
        const conversation = conversations.find((c) => c.id === conversationId);
        if (conversation && conversation.id !== this.currentConversation()?.id) {
          this.loadConversation(conversation);
        }
      } else if (!conversationId && this.currentConversation()) {
        // Clear conversation if no ID in URL
        this.currentConversation.set(null);
        this.chatService.unsubscribeFromMessages();
      }
    });

    // Auto-scroll to bottom when messages change
    effect(() => {
      const messages = this.chatService.messages();
      if (messages.length > 0) {
        this.scrollToBottom();
      }
    });
  }

  ngOnDestroy() {
    this.chatService.unsubscribeFromMessages();
    this.conversationService.unsubscribeFromConversations();
  }

  private async loadConversation(conversation: IConversation): Promise<void> {
    this.currentConversation.set(conversation);

    // Unsubscribe from previous conversation
    this.chatService.unsubscribeFromMessages();

    // Fetch and subscribe to messages for this conversation
    await this.chatService.fetchMessages(conversation.id);
    this.chatService.subscribeToMessages(conversation.id);
  }

  async onConversationSelected(conversation: IConversation): Promise<void> {
    // Navigate to the conversation URL
    await this.router.navigate(['/chat', conversation.id]);
  }

  async onUserSelected(user: IAuthUser): Promise<void> {
    // Get or create conversation with this user
    const conversation = await this.conversationService.getOrCreateConversation(user.id);
    await this.router.navigate(['/chat', conversation.id]);
  }

  private scrollToBottom(): void {
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      this.scrollAnchor()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, SCROLL_TO_BOTTOM_DELAY);
  }

  getOtherParticipant(conversation: IConversation | null) {
    if (!conversation) return null;
    return this.conversationService.getOtherParticipant(conversation);
  }

  getAvatarUrl(conversation: IConversation | null): string {
    const participant = this.getOtherParticipant(conversation);
    return this.authService.getAvatarUrl(participant);
  }

  async backToConversations(): Promise<void> {
    // Navigate back to chat without conversation ID
    await this.router.navigate(['/chat']);
  }
}
