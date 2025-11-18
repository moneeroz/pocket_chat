import { Component, inject, signal, input } from '@angular/core';
import { HlmButtonImports } from '@shared/components/ui/button/src';
import { HlmInputImports } from '@shared/components/ui/input/src';
import { HlmProgressImports } from '@shared/components/ui/progress/src';
import { HlmAlertImports } from '@shared/components/ui/alert/src';
import { ChatService } from '@/services/chat-service';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSend, lucideCircleAlert } from '@ng-icons/lucide';
import { FileUploadButton } from '../file-upload-button/file-upload-button';
import { FileUploadType } from '@shared/constants/app.constants';

@Component({
  selector: 'app-new-message',
  imports: [
    FormsModule,
    NgIcon,
    HlmButtonImports,
    HlmInputImports,
    HlmProgressImports,
    HlmAlertImports,
    FileUploadButton,
  ],
  viewProviders: [provideIcons({ lucideSend, lucideCircleAlert })],
  templateUrl: './new-message.html',
})
export class NewMessage {
  private readonly chatService = inject(ChatService);

  readonly conversationId = input.required<string>();

  messageText = '';
  protected readonly isSending = signal(false);
  protected readonly uploadProgress = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  async sendMessage(): Promise<void> {
    const trimmedMessage = this.messageText.trim();
    if (!trimmedMessage || this.isSending()) {
      return;
    }

    try {
      // Clear any previous error when attempting a new send
      this.errorMessage.set(null);
      this.isSending.set(true);

      await this.chatService.sendMessage(this.conversationId(), trimmedMessage);

      // Clear input
      this.messageText = '';
    } catch (error) {
      console.error('Failed to send message:', error);
      this.errorMessage.set('Failed to send message. Please try again.');
    } finally {
      this.isSending.set(false);
    }
  }

  async handleFileSelected(event: { file: File; type: FileUploadType }): Promise<void> {
    if (this.isSending()) return;

    try {
      // Clear previous error before starting upload
      this.errorMessage.set(null);
      this.isSending.set(true);
      this.uploadProgress.set(0);

      await this.chatService.sendFileMessage(
        this.conversationId(),
        event.file,
        event.type,
        (progress) => {
          this.uploadProgress.set(progress);
        }
      );
    } catch (error) {
      console.error('Failed to send file:', error);
      this.errorMessage.set('Failed to send file. Please try again.');
    } finally {
      this.isSending.set(false);
      this.uploadProgress.set(null);
    }
  }
}
