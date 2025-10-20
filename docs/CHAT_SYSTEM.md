# Team Chat System with Durable Objects

## Overview
A real-time chat system for workspace teams built with Cloudflare Durable Objects and WebSockets. Each workspace has its own isolated chat room where members can communicate in real-time and see who's online.

## Features

### ✅ Implemented
- **Real-time messaging** - Instant message delivery via WebSockets
- **Online presence** - See which team members are currently online
- **Message history** - Persistent chat history stored in Durable Objects
- **Chat bubble UI** - Floating chat button with unread count badge
- **Team isolation** - Each workspace has its own private chat room
- **Auto-reconnection** - Automatic reconnection with exponential backoff
- **Typing indicators** - Optional typing status broadcasting
- **Message timestamps** - All messages include formatted timestamps
- **Mobile-friendly** - Responsive design that works on all devices

## Architecture

### Backend Components

#### 1. Durable Object: ChatRoom
**Location:** [cloudflare-workers/src/durable-objects/ChatRoom.ts](../cloudflare-workers/src/durable-objects/ChatRoom.ts)

The `ChatRoom` Durable Object manages:
- WebSocket connections for each workspace
- Message history (stores last 1000 messages)
- Online user tracking
- Message broadcasting to all connected clients

**Key Methods:**
- `fetch()` - Handles WebSocket upgrades and HTTP requests
- `handleSession()` - Manages individual WebSocket connections
- `broadcast()` - Sends messages to all connected clients

#### 2. Worker: Chat API
**Location:** [cloudflare-workers/src/workers/chat.ts](../cloudflare-workers/src/workers/chat.ts)

HTTP endpoints:
- `GET /api/chat/workspace/:workspaceId/connect` - Upgrade to WebSocket
- `GET /api/chat/workspace/:workspaceId/messages` - Get message history
- `GET /api/chat/workspace/:workspaceId/online` - Get online users

All endpoints verify workspace membership before granting access.

### Frontend Components

#### 1. ChatBubble Component
**Location:** [src/components/ChatBubble.tsx](../src/components/ChatBubble.tsx)

Features:
- Floating chat bubble in bottom-right corner
- Unread message count badge
- Online presence indicator (green dot)
- Expandable chat panel
- Message list with auto-scroll
- Message input with send button
- Online users dropdown

#### 2. WebSocket Hook
**Location:** [src/hooks/useChatWebSocket.ts](../src/hooks/useChatWebSocket.ts)

Custom React hook that manages:
- WebSocket connection lifecycle
- Auto-reconnection logic
- Message state management
- Online user tracking
- Message sending

## Deployment

### 1. Deploy Durable Object

The Durable Object binding is already configured in `wrangler.toml`:

```toml
[[durable_objects.bindings]]
name = "CHAT_ROOM"
class_name = "ChatRoom"
script_name = "task-manager-api-dev"

[migrations]
tag = "v1"
new_classes = ["ChatRoom"]
```

Deploy to Cloudflare:

```bash
cd cloudflare-workers
wrangler deploy
```

### 2. No Database Changes Required
The chat system uses Durable Object storage, so no D1 migrations are needed.

### 3. Frontend Configuration
The chat automatically connects when a user is in a workspace. No additional configuration required.

## WebSocket Protocol

### Client → Server Messages

```json
// Send a chat message
{
  "type": "message",
  "content": "Hello team!"
}

// Send typing indicator
{
  "type": "typing"
}

// Keep-alive ping
{
  "type": "ping"
}
```

### Server → Client Messages

```json
// Message history on connect
{
  "type": "history",
  "messages": [
    {
      "id": "uuid",
      "userId": "user-id",
      "userName": "John Doe",
      "content": "Hello!",
      "timestamp": 1234567890,
      "type": "message"
    }
  ]
}

// New message received
{
  "type": "new_message",
  "message": {
    "id": "uuid",
    "userId": "user-id",
    "userName": "Jane Smith",
    "content": "Hi everyone!",
    "timestamp": 1234567890,
    "type": "message"
  }
}

// Online users list
{
  "type": "online_users",
  "onlineUsers": [
    {
      "userId": "user-id",
      "userName": "John Doe",
      "joinedAt": 1234567890
    }
  ]
}

// User joined
{
  "type": "user_joined",
  "userId": "user-id",
  "userName": "John Doe",
  "onlineUsers": [...]
}

// User left
{
  "type": "user_left",
  "userId": "user-id",
  "userName": "John Doe",
  "onlineUsers": [...]
}

// Typing indicator
{
  "type": "typing",
  "userId": "user-id",
  "userName": "John Doe"
}

// Keep-alive response
{
  "type": "pong"
}

// Error
{
  "type": "error",
  "message": "Error description"
}
```

## Usage

### For End Users

1. **Access Chat**
   - Look for the blue chat bubble in the bottom-right corner
   - Click to open the chat panel

2. **View Online Members**
   - Click the Users icon in the chat header
   - See a list of all currently online team members

3. **Send Messages**
   - Type your message in the input field
   - Press Enter or click the Send button
   - Messages are delivered instantly to all online members

4. **Receive Notifications**
   - Unread message count appears on the chat bubble
   - Badge shows number of unread messages (up to 9+)

### For Developers

#### Custom Chat Features

You can extend the chat system by modifying:

1. **Add file uploads** - Update `ChatRoom.ts` to handle file messages
2. **Add reactions** - Store emoji reactions in message metadata
3. **Add threads** - Implement threaded conversations
4. **Add mentions** - Parse and highlight @mentions
5. **Add search** - Add message search functionality

#### Security Considerations

- ✅ Workspace isolation enforced at API level
- ✅ Authentication required for all connections
- ✅ User verification before WebSocket upgrade
- ✅ No sensitive data in WebSocket URLs
- ⚠️ Message content is not encrypted (consider E2E encryption for sensitive data)

## Monitoring & Debugging

### Check Durable Object Status

```bash
# View DO stats in Cloudflare Dashboard
# Workers & Pages → task-manager-api-dev → Durable Objects
```

### Debug WebSocket Connections

In browser console:

```javascript
// Check connection status
localStorage.getItem('token')

// Monitor WebSocket messages
// Open DevTools → Network → WS tab
```

### Common Issues

**Issue: Chat not connecting**
- Verify user is authenticated
- Check workspace membership
- Ensure Durable Object is deployed
- Check WebSocket URL in browser DevTools

**Issue: Messages not persisting**
- Check Durable Object storage limits
- Verify message history is loading correctly
- Check for errors in Workers logs

**Issue: Users not showing as online**
- Verify WebSocket connection is established
- Check online user tracking in Durable Object
- Ensure user info is passed correctly on connect

## Performance

### Scalability
- Each workspace chat is an isolated Durable Object
- Objects automatically scale based on usage
- Message history limited to 1000 messages per room
- WebSocket connections are lightweight

### Costs
- Durable Object requests: ~$0.15 per million requests
- WebSocket duration: Minimal impact
- Storage: ~1MB per active workspace (approx 1000 messages)

## Future Enhancements

- [ ] File and image sharing
- [ ] Message reactions and emoji support
- [ ] Threaded conversations
- [ ] @mentions with notifications
- [ ] Message search and filtering
- [ ] Message editing and deletion
- [ ] Direct messages between users
- [ ] Voice and video calls integration
- [ ] Push notifications for mobile
- [ ] End-to-end encryption

## Related Files

- Backend Durable Object: [cloudflare-workers/src/durable-objects/ChatRoom.ts](../cloudflare-workers/src/durable-objects/ChatRoom.ts)
- Backend API: [cloudflare-workers/src/workers/chat.ts](../cloudflare-workers/src/workers/chat.ts)
- Frontend Component: [src/components/ChatBubble.tsx](../src/components/ChatBubble.tsx)
- WebSocket Hook: [src/hooks/useChatWebSocket.ts](../src/hooks/useChatWebSocket.ts)
- Type Definitions: [cloudflare-workers/src/types/index.ts](../cloudflare-workers/src/types/index.ts)
- Configuration: [cloudflare-workers/wrangler.toml](../cloudflare-workers/wrangler.toml)

## Testing

### Manual Testing Steps

1. **Single User Test**
   - Log in to workspace
   - Open chat bubble
   - Send a message
   - Verify message appears in history

2. **Multiple Users Test**
   - Log in with two different accounts in same workspace
   - Send messages from both accounts
   - Verify real-time delivery
   - Verify online presence indicators

3. **Reconnection Test**
   - Open chat
   - Disable network connection
   - Re-enable network
   - Verify automatic reconnection

4. **Workspace Isolation Test**
   - Log in to two different workspaces
   - Verify chat messages don't leak between workspaces

## Support

For issues or questions:
1. Check browser console for errors
2. Check Cloudflare Workers logs
3. Verify Durable Object deployment status
4. Review WebSocket protocol messages in DevTools
