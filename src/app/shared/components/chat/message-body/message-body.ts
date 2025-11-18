import { Component, computed, inject, input, signal, OnDestroy } from '@angular/core';
import { IMessage } from '@shared/interfaces/imessage';
import { AuthService } from '@/services/auth-service';
import { ChatService } from '@/services/chat-service';
import { formatMessageTime } from '@shared/utils/date.utils';
import { formatFileSize, getFileIcon } from '@shared/utils/file.utils';
import { LONG_PRESS_DURATION } from '@shared/constants/app.constants';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { BrnAlertDialogImports } from '@spartan-ng/brain/alert-dialog';
import { HlmAlertDialogImports } from '@shared/components/ui/alert-dialog/src';
import { HlmButtonImports } from '@shared/components/ui/button/src';
import {
  lucideDownload,
  lucideFile,
  lucideFileText,
  lucideFileArchive,
  lucideMusic,
  lucideVideo,
  lucideImage,
  lucideTrash2,
} from '@ng-icons/lucide';

@Component({
  selector: 'app-message-body',
  imports: [NgIcon, BrnAlertDialogImports, HlmAlertDialogImports, HlmButtonImports],
  viewProviders: [
    provideIcons({
      lucideDownload,
      lucideFile,
      lucideFileText,
      lucideFileArchive,
      lucideMusic,
      lucideVideo,
      lucideImage,
      lucideTrash2,
    }),
  ],
  templateUrl: './message-body.html',
})
export class MessageBody implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);

  message = input.required<IMessage>();

  // Long-press state
  protected readonly showActions = signal(false);
  private longPressTimer: number | null = null;
  private readonly LONG_PRESS_DURATION = LONG_PRESS_DURATION;

  readonly isCurrentUser = computed(() => this.message().user === this.authService.user()?.id);

  readonly formattedTime = computed(() => formatMessageTime(this.message().created));

  readonly isFileMessage = computed(() => !!this.message().file);

  readonly fileUrl = computed(() => {
    const msg = this.message();
    return msg.file ? this.chatService.getFileUrl(msg) : '';
  });

  readonly fileIcon = computed(() => getFileIcon(this.message().fileType, this.message().fileName));

  readonly containerClass = computed(() => {
    const base = 'group flex gap-2 py-1 px-2 md:px-4';
    return this.isCurrentUser() ? `${base} flex-row-reverse text-left` : base;
  });

  readonly contentWrapperClass = computed(() => {
    const base = 'max-w-[85%] md:max-w-[70%] flex flex-col relative';
    return this.isCurrentUser() ? `${base} items-end` : base;
  });

  readonly headerClass = computed(() => {
    const base = 'flex items-center gap-1';
    return this.isCurrentUser() ? `${base} flex-row-reverse` : base;
  });

  readonly messageClass = computed(() => {
    const base =
      'min-w-[100px] px-2.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm break-words shadow-sm text-wrap';
    return this.isCurrentUser()
      ? `${base} bg-accent dark:bg-primary/40 rounded-tr-xl rounded-l-xl`
      : `${base} bg-gray-300 dark:bg-accent rounded-bl-xl rounded-r-xl`;
  });

  downloadFile(): void {
    const url = this.fileUrl();
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = this.message().fileName + '?download=1' || 'download';
      link.click();
    }
  }

  async deleteFile(): Promise<void> {
    if (!this.isCurrentUser() || !this.isFileMessage()) {
      return;
    }

    try {
      await this.chatService.deleteMessage(this.message().id);
      this.showActions.set(false);
    } catch (error) {
      console.error('Failed to delete file:', error);
      // Error will be shown in alert dialog
    }
  }

  onPressStart(event: MouseEvent | TouchEvent): void {
    if (!this.isCurrentUser() || !this.isFileMessage()) {
      return;
    }

    event.preventDefault();
    this.longPressTimer = setTimeout(() => {
      this.showActions.set(true);
    }, this.LONG_PRESS_DURATION);
  }

  onPressEnd(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  onPressCancel(): void {
    this.onPressEnd();
  }

  hideActions(): void {
    this.showActions.set(false);
  }

  ngOnDestroy(): void {
    // Clear any pending timers to prevent memory leaks
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  // Expose utility functions for template
  protected formatFileSize = formatFileSize;
}
