import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@/services/auth-service';
import { Router } from '@angular/router';
import { FILE_SIZE_LIMITS } from '@shared/constants/app.constants';
import { Location } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideUpload } from '@ng-icons/lucide';
import { HlmCardImports } from '@shared/components/ui/card/src';
import { HlmLabelImports } from '@shared/components/ui/label/src';
import { HlmInputImports } from '@shared/components/ui/input/src';
import { HlmButtonImports } from '@shared/components/ui/button/src';
import { HlmFormFieldImports } from '@shared/components/ui/form-field/src';
import { HlmAvatarImports } from '@shared/components/ui/avatar/src';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HlmCardImports,
    HlmLabelImports,
    HlmInputImports,
    HlmButtonImports,
    HlmFormFieldImports,
    HlmAvatarImports,
  ],
  viewProviders: [
    provideIcons({
      lucideArrowLeft,
      lucideUpload,
    }),
  ],
  templateUrl: './profile.html',
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  protected readonly user = this.authService.user;
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly previewUrl = signal<string | null>(null);

  // Computed signal for current avatar URL
  protected readonly currentAvatarUrl = computed(() => {
    return this.authService.getAvatarUrl();
  });

  protected readonly passwordForm: FormGroup = this.fb.group(
    {
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: this.passwordMatchValidator,
    }
  );

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  goBack(): void {
    // Use browser back to preserve the previous route (chat with conversation ID)
    this.location.back();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    // Reset previous errors
    this.error.set(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.error.set('Please select an image file');
      input.value = ''; // Reset input
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > FILE_SIZE_LIMITS.avatar) {
      this.error.set('Image must be less than 5MB');
      input.value = ''; // Reset input
      return;
    }

    this.selectedFile.set(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl.set(e.target?.result as string);
    };
    reader.onerror = () => {
      this.error.set('Failed to read file');
      this.selectedFile.set(null);
    };
    reader.readAsDataURL(file);
  }

  async uploadAvatar(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this.isLoading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      await this.authService.updateAvatar(file);
      this.success.set('Avatar updated successfully!');
      this.selectedFile.set(null);
      this.previewUrl.set(null);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to upload avatar');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onPasswordSubmit(): Promise<void> {
    if (this.passwordForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.success.set(null);

    const { currentPassword, newPassword } = this.passwordForm.value;

    try {
      await this.authService.updatePassword(currentPassword, newPassword);
      this.success.set('Password updated successfully!');
      this.passwordForm.reset();
    } catch (error: any) {
      this.error.set(error.message || 'Failed to update password');
    } finally {
      this.isLoading.set(false);
    }
  }
}
