# PocketChat

A modern real-time chat application built with Angular 20+ and PocketBase, featuring WhatsApp-style inline file sharing, dark mode, and responsive design.

## Features

- **Real-time Messaging**: Instant message delivery using PocketBase subscriptions
- **Multi-user Conversations**: Search for users and start chatting
- **Friend Request System**: Send, accept, and reject friend requests with real-time badges
- **User Blocking**: Block users to prevent communication with one-way blocking logic
- **Friends Management Page**: Dedicated page to manage pending requests and blocked users
- **WhatsApp-style File Sharing**: Upload images, videos, audio, and documents directly in chat
  - Image messages with inline preview
  - Video messages with embedded player
  - Audio messages with player controls
  - Document messages with file type icons
  - Upload progress tracking with real-time feedback
  - Optional text captions for all media types
  - Three-dot menu for file actions (download/delete)
- **User Profile Management**:
  - Update password with current password verification
  - Upload/change profile avatar (max 5MB)
  - View account information (email/username read-only)
- **User Menu**: Dropdown menu with profile access, dark mode toggle, and sign out
- **Smart Time Display**: WhatsApp-style progressive formatting (now, X ago, time, yesterday, day, date)
- **Dark Mode**: Toggle between light and dark themes with persistence
- **Responsive Design**: Optimized for mobile, tablet, and desktop with proper scrolling
- **URL-based Navigation**: Shareable conversation links with proper back navigation
- **Production Ready**: Memory leak prevention, type safety, comprehensive error handling, OnPush change detection

## Best Practices Implemented

- ✅ **OnPush Change Detection**: Some components use `ChangeDetectionStrategy.OnPush` for optimal performance
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
- **Performance**: OnPush change detection strategy across components
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
│   ├── friends/        # Friend requests and blocked users management
│   ├── layout/         # Main layout wrapper
│   ├── login/          # Authentication - login
│   ├── profile/        # User profile management (avatar, password)
│   └── register/       # Authentication - register
├── services/           # Business logic & API
│   ├── auth-service.ts         # Authentication, user management, avatar URLs
│   ├── chat-service.ts         # Messages, file uploads, real-time subscriptions
│   ├── conversation-service.ts # Conversation management and filtering
│   ├── relation-service.ts     # Friend requests, blocking, relations
│   └── theme-service.ts        # Dark/light mode persistence
├── guards/             # Route guards
│   └── auth-guard.ts
├── shared/
│   ├── components/     # Reusable UI components
│   │   ├── chat/      # Chat-specific components
│   │   │   ├── conversation-list/        # Conversation sidebar
│   │   │   ├── file-upload-button/       # Multi-type file picker
│   │   │   ├── message-body/             # Message rendering (text + media)
│   │   │   ├── new-message/              # Message input with file upload
│   │   │   ├── user-search/              # Search users to start chats
│   │   │   └── relation-action-button/   # Friend/block action button
│   │   ├── header/
│   │   │   ├── header.ts/html           # App header
│   │   │   └── user-menu/               # User dropdown (profile, theme, logout)
│   │   └── ui/        # UI library components (buttons, cards, etc.)
│   ├── interfaces/    # TypeScript interfaces
│   │   ├── iauth-user.ts      # User authentication interface
│   │   ├── iconversation.ts   # Conversation interface
│   │   ├── imessage.ts        # Message interface (text + file fields)
│   │   └── irelation.ts       # Friend request and blocking interface
│   ├── utils/         # Reusable utility functions
│   │   ├── date.utils.ts      # WhatsApp-style time formatting
│   │   ├── error.utils.ts     # Error handling utilities
│   │   └── file.utils.ts      # File size/icon utilities
│   └── constants/     # Application constants
│       └── app.constants.ts   # File types, sizes, timeouts, debounce, relations
└── environments/      # Environment configurations
```

## Friend Request & Blocking System

The application includes a comprehensive friend request and blocking system:

### Friend Request States

| State | Meaning | Sender's Button | Receiver's Button |
|-------|---------|-----------------|-------------------|
| `no_relation` | Not connected | Add Friend | Add Friend |
| `pending_sent` | Request sent | Pending (can cancel) | Accept/Reject |
| `pending_received` | Request received | N/A | Accept/Reject |
| `friend` | Mutual friends | Remove Friend | Remove Friend |
| `blocked` (by me) | I blocked them | Unblock | Can't interact |
| `blocked` (by them) | They blocked me | Can't interact | Unblock |

### Friend Management Page

Dedicated `/friends` page for managing relationships:

1. **Pending Friend Requests Section**
   - Shows all received friend requests with usernames and avatars
   - Quick Accept or Reject buttons
   - Reject removes the relation from DB completely

2. **Blocked Users Section**
   - Shows all users you've blocked
   - One-click Unblock to restore communication

### Blocking Features

- **One-way Blocking**: Users can block each other independently
- **Prevents Communication**: Blocked users can't send messages to each other
- **Conversation Access**: Blocked users can still see existing conversations but can't interact
- **Search Access**: Blocked users can still search for each other
- **Database Cleaned**: Rejecting requests deletes the relation record entirely

### Technical Implementation

- **Relation Service**: Centralized service for all friend/block operations
- **Real-time Updates**: WebSocket subscriptions keep UI synchronized
- **Computed Signals**: Pending requests and blocked users auto-update
- **Database Queries**: Initial status checks query database directly for accuracy
- **Immediate UI Feedback**: Button state updates instantly after actions

## File Upload System

The application features a WhatsApp-inspired file upload system:

### Supported File Types

1. **Images** (.jpg, .jpeg, .png, .gif, .webp)
   - Inline preview in chat
   - Centered display with background fill
   - Three-dot menu for download/delete
   - Optional text caption

2. **Videos** (.mp4, .webm, .ogg)
   - Embedded video player
   - Playback controls
   - Three-dot menu for download/delete
   - Optional text caption

3. **Audio** (.mp3, .wav, .ogg, .m4a)
   - Audio player with controls
   - Three-dot menu for download/delete
   - Optional text caption

4. **Documents** (.pdf, .doc, .docx, .txt, .zip, etc.)
   - File icon based on type
   - File size display
   - Three-dot menu for download/delete
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
- **URL Generation**: PocketBase API file URL helper with `?download=1` parameter
- **Menu System**: Three-dot dropdown menu for file actions
- **Aspect Ratio**: Images and videos display in professional 16:9 format
- **File Size Limits**:
  - Images: 10MB
  - Videos: 50MB
  - Audio: 20MB
  - Documents: 20MB
  - Avatars: 5MB
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

### Relations Collection (Friend Requests & Blocking)

```javascript
{
  from_user: { type: 'relation', collection: 'users' },
  to_user: { type: 'relation', collection: 'users' },
  type: { 
    type: 'select', 
    values: ['friend', 'pending_sent', 'pending_received', 'blocked'] 
  }
}
```

**Permissions:**
```
update: from_user.id = @request.auth.id || to_user.id = @request.auth.id
delete: from_user.id = @request.auth.id
```

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
