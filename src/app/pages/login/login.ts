import { AuthService } from '@/services/auth-service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmCardImports } from '@shared/components/ui/card/src';
import { HlmLabelImports } from '@shared/components/ui/label/src';
import { HlmInputImports } from '@shared/components/ui/input/src';
import { HlmButtonImports } from '@shared/components/ui/button/src';
import { HlmFormFieldImports } from '@shared/components/ui/form-field/src';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmCardImports,
    HlmLabelImports,
    HlmInputImports,
    HlmButtonImports,
    HlmFormFieldImports,
  ],
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly isLoading = this.authService.isLoading;
  protected readonly error = this.authService.error;

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.value;

    try {
      await this.authService.login(email, password);
      await this.router.navigate(['/chat']);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }
}
