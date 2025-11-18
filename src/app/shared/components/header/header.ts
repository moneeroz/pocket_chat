import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMessageSquareDashed, lucideWifiOff } from '@ng-icons/lucide';
import { UserMenu } from './user-menu/user-menu';


@Component({
  selector: 'app-header',
  imports: [NgIcon, UserMenu],
  viewProviders: [
    provideIcons({
      lucideMessageSquareDashed,
      lucideWifiOff,
    }),
  ],
  templateUrl: './header.html',
})
export class Header {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // Signal for current path that updates on navigation
  protected readonly currentPath = signal(this.router.url);

  // Signal for online/offline status
  protected readonly isOnline = signal(navigator.onLine);

  constructor() {
    // Subscribe to router events to update currentPath signal
    // Automatically unsubscribes when component is destroyed
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentPath.set(event.urlAfterRedirects);
      });

    // Listen for online/offline events
    const onlineHandler = () => this.isOnline.set(true);
    const offlineHandler = () => this.isOnline.set(false);

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    // Cleanup event listeners when component is destroyed
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    });
  }
}
