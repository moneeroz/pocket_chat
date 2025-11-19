import { Component, computed, inject, input, signal, OnDestroy } from '@angular/core';
import { IMessage } from '@shared/interfaces/imessage';
import { AuthService } from '@/services/auth-service';
import { ChatService } from '@/services/chat-service';
import { formatMessageTime } from '@shared/utils/date.utils';
import { formatFileSize, getFileIcon } from '@shared/utils/file.utils';
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
  lucideMoreVertical,
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
      lucideMoreVertical,
    }),
  ],
  templateUrl: './message-body.html',
})
export class MessageBody implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);

  message = input.required<IMessage>();

  // Menu state for file actions
  protected readonly showFileMenu = signal(false);

  readonly isCurrentUser = computed(() => this.message().user === this.authService.user()?.id);

  readonly formattedTime = computed(() => formatMessageTime(this.message().created));

  readonly isFileMessage = computed(() => !!this.message().file);

  readonly fileUrl = computed(() => {
    const msg = this.message();
    return msg.file ? this.chatService.getFileUrl(msg) : '';
  });

  readonly fileIcon = computed(() => getFileIcon(this.message().fileType, this.message().fileName));

  readonly containerClass = computed(() => {
    const base = 'group flex gap-2 py-2 px-2 md:px-4';
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
      link.download = this.message().fileName || 'download';
      link.click();
    }
    this.closeFileMenu();
  }

  async deleteFile(): Promise<void> {
    if (!this.isCurrentUser() || !this.isFileMessage()) {
      return;
    }

    try {
      await this.chatService.deleteMessage(this.message().id);
      this.closeFileMenu();
    } catch (error) {
      // Error will be shown in alert dialog
    }
  }

  toggleFileMenu(event: Event): void {
    event.stopPropagation();
    this.showFileMenu.update((v) => !v);
  }

  closeFileMenu(): void {
    this.showFileMenu.set(false);
  }

  ngOnDestroy(): void {
    this.closeFileMenu();
  }

  // Expose utility functions for template
  protected formatFileSize = formatFileSize;
}
