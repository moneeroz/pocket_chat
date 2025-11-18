# PocketChat

A modern real-time chat application built with Angular 20+ and PocketBase, featuring WhatsApp-style inline file sharing, dark mode, and responsive design.

## Features

- **Real-time Messaging**: Instant message delivery using PocketBase subscriptions
- **Multi-user Conversations**: Search for users and start chatting
- **WhatsApp-style File Sharing**: Upload images, videos, audio, and documents directly in chat
  - Image messages with inline preview
  - Video messages with embedded player
  - Audio messages with player controls
  - Document messages with file type icons and download
  - Upload progress tracking
  - Optional text captions for media
- **User Profile Management**:
  - Update password with current password verification
  - Upload/change profile avatar (max 5MB)
  - View account information (email/username read-only)
- **User Menu**: Dropdown menu with profile access, dark mode toggle, and sign out
- **Smart Time Display**: WhatsApp-style progressive formatting (now, X ago, time, yesterday, day, date)
- **Dark Mode**: Toggle between light and dark themes with persistence
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **URL-based Navigation**: Shareable conversation links with proper back navigation
- **Production Ready**: Memory leak prevention, type safety, comprehensive error handling, OnPush change detection

## Best Practices Implemented

- ✅ **OnPush Change Detection**: All components use `ChangeDetectionStrategy.OnPush` for optimal performance
- ✅ **Proper Cleanup**: `OnDestroy` implementation with timer/subscription cleanup
- ✅ **Signal-based State**: Reactive state management with readonly and protected modifiers
- ✅ **Type Safety**: No `any` types, strict TypeScript configuration
- ✅ **Constant Extraction**: Magic numbers extracted to centralized constants file
- ✅ **Modern Patterns**: `inject()`, `input()`, `output()`, control flow syntax
- ✅ **Error Handling**: Consistent error handling utilities across services
- ✅ **Memory Safety**: No memory leaks from subscriptions, timers, or event listeners

## Tech Stack

- **Frontend**: Angular 20+ (standalone components, signals, computed, effects, toSignal)
- **Backend**: PocketBase - real-time subscriptions, file storage, auth
- **Styling**: Tailwind CSS with dark mode variants and Spartan UI
- **Icons**: Lucide Icons via @ng-icons
- **Date Formatting**: date-fns with custom WhatsApp-style utilities
- **Type Safety**: Strict TypeScript with no `any` types
- **State Management**: Signal-based reactive patterns
- **Performance**: OnPush change detection strategy across all components
- **Memory Management**: Proper cleanup with OnDestroy and DestroyRef patterns

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Project Structure

```
src/app/
├── pages/               # Route components
│   ├── chat/           # Chat interface with inline file uploads
│   ├── layout/         # Main layout wrapper
│   ├── login/          # Authentication - login
│   ├── profile/        # User profile management (avatar, password)
│   └── register/       # Authentication - register
├── services/           # Business logic & API
│   ├── auth-service.ts         # Authentication, user management, avatar URLs
│   ├── chat-service.ts         # Messages, file uploads, real-time subscriptions
│   ├── conversation-service.ts # Conversation management
│   └── theme-service.ts        # Dark/light mode persistence
├── guards/             # Route guards
│   └── auth-guard.ts
├── shared/
│   ├── components/     # Reusable UI components
│   │   ├── chat/      # Chat-specific components
│   │   │   ├── conversation-list/   # Conversation sidebar
│   │   │   ├── file-upload-button/  # Multi-type file picker
│   │   │   ├── message-body/        # Message rendering (text + media)
│   │   │   ├── new-message/         # Message input with file upload
│   │   │   └── user-search/         # Search users to start chats
│   │   ├── header/
│   │   │   ├── header.ts/html      # App header
│   │   │   └── user-menu/          # User dropdown (profile, theme, logout)
│   │   └── ui/        # UI library components (buttons, cards, etc.)
│   ├── interfaces/    # TypeScript interfaces
│   │   ├── iauth-user.ts      # User authentication interface
│   │   ├── iconversation.ts   # Conversation interface
│   │   └── imessage.ts        # Message interface (text + file fields)
│   ├── utils/         # Reusable utility functions
│   │   ├── date.utils.ts      # WhatsApp-style time formatting
│   │   ├── error.utils.ts     # Error handling utilities
│   │   └── file.utils.ts      # File size/icon utilities
│   └── constants/     # Application constants
│       └── app.constants.ts   # File types, sizes, timeouts, debounce durations
└── environments/      # Environment configurations
```

## File Upload System

The application features a WhatsApp-inspired file upload system:

### Supported File Types

1. **Images** (.jpg, .jpeg, .png, .gif, .webp)
   - Inline preview in chat
   - Click to download
   - Optional text caption

2. **Videos** (.mp4, .webm, .ogg)
   - Embedded video player
   - Playback controls
   - Optional text caption

3. **Audio** (.mp3, .wav, .ogg, .m4a)
   - Audio player with controls
   - Optional text caption

4. **Documents** (.pdf, .doc, .docx, .txt, .zip, etc.)
   - File icon based on type
   - File size display
   - Click to download
   - Optional text caption

### Upload Flow

1. Click the **+** button next to message input
2. Select file type from dropdown menu
3. Choose file from device
4. Add optional text caption
5. Send message (shows upload progress)

### Technical Implementation

- **Progress Tracking**: XMLHttpRequest with progress events (0-100%)
- **File Storage**: PocketBase messages collection with file attachment
- **URL Generation**: PocketBase API file URL helper
- **Message Interface**:
  ```typescript
  interface IMessage {
    text?: string;              // Optional for media-only messages
    file?: string;              // PocketBase file field
    fileType?: 'image' | 'video' | 'audio' | 'document';
    fileName?: string;
    fileSize?: number;          // Bytes
    thumbnail?: string;         // For video thumbnails
    // ... other fields
  }
  ```

## PocketBase Schema

### Messages Collection

```javascript
{
  conversationId: { type: 'relation', collection: 'conversations' },
  user: { type: 'relation', collection: 'users' },
  text: { type: 'text', required: false },
  file: { type: 'file', maxSize: 52428800 }, // 50MB
  fileType: { type: 'select', values: ['image', 'video', 'audio', 'document'] },
  fileName: { type: 'text' },
  fileSize: { type: 'number' },
  thumbnail: { type: 'text' }
}
```

### Conversations Collection

```javascript
{
  participants: { type: 'relation', collection: 'users', multiple: true },
  lastMessage: { type: 'text' },
  lastMessageAt: { type: 'date' }
}
```

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
