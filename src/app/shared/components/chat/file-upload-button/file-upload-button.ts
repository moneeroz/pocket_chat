import { Component, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideImage, lucideVideo, lucideMusic, lucideFile } from '@ng-icons/lucide';
import { FILE_ACCEPT_TYPES, FileUploadType } from '@shared/constants/app.constants';

@Component({
  selector: 'app-file-upload-button',
  imports: [NgIcon],
  viewProviders: [
    provideIcons({
      lucidePlus,
      lucideImage,
      lucideVideo,
      lucideMusic,
      lucideFile,
    }),
  ],
  templateUrl: './file-upload-button.html',
})
export class FileUploadButton {
  readonly fileSelected = output<{ file: File; type: FileUploadType }>();

  protected readonly showMenu = signal(false);

  toggleMenu(): void {
    this.showMenu.update((v) => !v);
  }

  closeMenu(): void {
    this.showMenu.set(false);
  }

  triggerFileInput(type: FileUploadType): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = FILE_ACCEPT_TYPES[type];

    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.fileSelected.emit({ file, type });
        this.closeMenu();
      }
    };

    input.click();
  }
}
