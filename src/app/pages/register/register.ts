import { AuthService } from '@/services/auth-service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmCardImports } from '@shared/components/ui/card/src';
import { HlmLabelImports } from '@shared/components/ui/label/src';
import { HlmInputImports } from '@shared/components/ui/input/src';
import { HlmButtonImports } from '@shared/components/ui/button/src';
import { HlmFormFieldImports } from '@shared/components/ui/form-field/src';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmCardImports,
    HlmLabelImports,
    HlmInputImports,
    HlmButtonImports,
    HlmFormFieldImports,
  ],
  templateUrl: './register.html',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly isLoading = signal(false);
  protected readonly hasError = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly registerForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    passwordConfirm: ['', [Validators.required]],
  });

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) return;

    const { username, email, password, passwordConfirm } = this.registerForm.value;

    if (password !== passwordConfirm) {
      this.hasError.set(true);
      this.errorMessage.set('Passwords do not match');
      return;
    }

    this.isLoading.set(true);
    this.hasError.set(false);
    this.errorMessage.set('');

    try {
      await this.authService.register(email, password, passwordConfirm, username);
    } catch (error: any) {
      this.hasError.set(true);
      this.errorMessage.set(error?.message || 'Registration failed. Please try again.');
      console.error('Registration failed:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
