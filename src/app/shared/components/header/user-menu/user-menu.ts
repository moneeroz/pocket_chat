import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideUser,
  lucideUsers,
  lucideLogOut,
  lucideMoon,
  lucideSun,
  lucideChevronDown,
} from '@ng-icons/lucide';
import { AuthService } from '@/services/auth-service';
import { ThemeService } from '@/services/theme-service';
import { RelationService } from '@/services/relation-service';
import { HlmAvatarImports } from '@shared/components/ui/avatar/src';


@Component({
  selector: 'app-user-menu',
  imports: [NgIcon, HlmAvatarImports],
  viewProviders: [
    provideIcons({
      lucideUser,
      lucideUsers,
      lucideLogOut,
      lucideMoon,
      lucideSun,
      lucideChevronDown,
    }),
  ],
  templateUrl: './user-menu.html',
})
export class UserMenu {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly relationService = inject(RelationService);
  private readonly router = inject(Router);

  protected readonly user = this.authService.user;
  protected readonly isDarkMode = this.themeService.isDarkMode;
  protected readonly showMenu = signal(false);
  protected readonly pendingRequestCount = computed(() => this.relationService.pendingRequestCount());

  protected readonly themeIcon = computed(() => (this.isDarkMode() ? 'lucideSun' : 'lucideMoon'));

  protected readonly themeLabel = computed(() => (this.isDarkMode() ? 'Light Mode' : 'Dark Mode'));

  protected readonly userInitial = computed(() => {
    const username = this.user()?.username || '';
    return username.charAt(0).toUpperCase();
  });

  protected readonly avatarUrl = computed(() => {
    return this.authService.getAvatarUrl();
  });

  toggleMenu(): void {
    this.showMenu.update((v) => !v);
  }

  closeMenu(): void {
    this.showMenu.set(false);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.closeMenu();
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
    this.closeMenu();
  }

  navigateToFriends(): void {
    this.router.navigate(['/friends']);
    this.closeMenu();
  }

  async signOut(): Promise<void> {
    this.closeMenu();
    this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
