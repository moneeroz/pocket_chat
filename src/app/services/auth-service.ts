import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IAuthUser } from '@shared/interfaces/iauth-user';
import PocketBase, { RecordAuthResponse, RecordModel } from 'pocketbase';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = environment.baseUrl;
  private readonly pb = new PocketBase(this.baseUrl);
  private readonly router = inject(Router);

  // Signals for reactive state management
  private readonly userSignal = signal<IAuthUser | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  // Public computed signals (read-only)
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  constructor() {
    // Initialize auth state from PocketBase storage on service creation
    this.initializeAuthState();

    // Set up auth refresh listener
    this.setupAuthRefresh();
  }

  /**
   * Initialize authentication state from stored token
   */
  private initializeAuthState(): void {
    this.loadingSignal.set(true);
    try {
      // PocketBase automatically loads the token from localStorage
      if (this.pb.authStore.isValid && this.pb.authStore.record) {
        this.setUser(this.pb.authStore.record);
      }
    } catch (error) {
      console.error('Failed to initialize auth state');
      this.clearUser();
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Set up automatic auth refresh
   */
  private setupAuthRefresh(): void {
    // Listen to auth store changes
    this.pb.authStore.onChange((token, record) => {
      if (token && record) {
        this.setUser(record);
      } else {
        this.clearUser();
      }
    });
  }

  /**
   * Log in with email and password
   */
  async login(email: string, password: string): Promise<void> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const authData: RecordAuthResponse<RecordModel> = await this.pb
        .collection('users')
        .authWithPassword(email, password);

      this.setUser(authData.record);
      this.router.navigate(['/chat']);
    } catch (error) {
      const errorMessage = 'Login failed';
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    passwordConfirm: string,
    username?: string
  ): Promise<void> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      // Create the user
      await this.pb.collection('users').create({
        email,
        password,
        passwordConfirm,
        username: username || email.split('@')[0],
      });

      // Automatically log in after registration
      await this.login(email, password);
    } catch (error) {
      const errorMessage = 'Registration failed';
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Log out the current user
   */
  logout(): void {
    this.pb.authStore.clear();
    this.clearUser();
    this.router.navigate(['/login']);
  }

  /**
   * Refresh the authentication token
   */
  async refreshAuth(): Promise<void> {
    try {
      if (!this.pb.authStore.isValid) {
        throw new Error('No valid token to refresh');
      }

      const authData = await this.pb.collection('users').authRefresh();
      this.setUser(authData.record);
    } catch (error) {
      console.error('Auth refresh failed');
      this.logout();
    }
  }

  /**
   * Set user data in signal
   */
  private setUser(record: RecordModel): void {
    const user: IAuthUser = {
      id: record.id,
      email: record['email'],
      username: record['username'],
      avatar: record['avatar'],
    };
    this.userSignal.set(user);
  }

  /**
   * Clear user data
   */
  private clearUser(): void {
    this.userSignal.set(null);
  }

  /**
   * Get the PocketBase instance for direct access if needed
   */
  getPocketBase(): PocketBase {
    return this.pb;
  }

  /**
   * Get auth token for HTTP requests
   */
  getToken(): string {
    return this.pb.authStore.token;
  }

  /**
   * Update user password
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = this.userSignal();
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      // Verify current password by attempting to login
      try {
        await this.pb.collection('users').authWithPassword(user.email, currentPassword);
      } catch (error) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      await this.pb.collection('users').update(user.id, {
        password: newPassword,
        passwordConfirm: newPassword,
        oldPassword: currentPassword,
      });

      // Refresh auth to get new token
      await this.refreshAuth();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update password';
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Update user avatar
   */
  async updateAvatar(file: File): Promise<void> {
    const user = this.userSignal();
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const formData = new FormData();
      formData.append('avatar', file);

      const updatedRecord = await this.pb.collection('users').update(user.id, formData);
      this.setUser(updatedRecord);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to upload avatar';
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get avatar URL for a user
   */
  getAvatarUrl(user?: IAuthUser | null, avatarFilename?: string): string {
    const currentUser = user || this.userSignal();
    if (!currentUser?.avatar) {
      return '';
    }

    const filename = avatarFilename || currentUser.avatar;
    return this.pb.files.getURL(
      {
        id: currentUser.id,
        collectionId: 'users',
        collectionName: 'users',
      } as any,
      filename
    );
  }
}