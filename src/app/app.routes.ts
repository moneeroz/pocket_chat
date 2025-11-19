import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { authGuard, guestGuard } from './guards/auth-guard';
import { Layout } from './pages/layout/layout';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    component: Login,
    title: 'Login',
     canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
    title: 'Register',
    canActivate: [guestGuard],
  },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      {
        path: 'chat',
        loadComponent: () => import('./pages/chat/chat').then((m) => m.Chat),
        title: 'Chat',
      },
      {
        path: 'chat/:conversationId',
        loadComponent: () => import('./pages/chat/chat').then((m) => m.Chat),
        title: 'Chat',
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
        title: 'Profile Settings',
      },
      {
        path: 'friends',
        loadComponent: () => import('./pages/friends/friends').then((m) => m.Friends),
        title: 'Friends',
      },
    ],
  },
];
