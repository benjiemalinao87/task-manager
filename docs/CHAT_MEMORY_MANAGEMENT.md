# Chat System Memory Management & Leak Prevention

## Overview
Comprehensive memory leak prevention and connection management for the WebSocket-based chat system.

## Memory Leak Prevention Strategies

### 1. Frontend - WebSocket Connection Management

#### Proper Cleanup on Component Unmount
[src/hooks/useChatWebSocket.ts](../src/hooks/useChatWebSocket.ts)

```typescript
useEffect(() => {
  connect();

  return () => {
    // Clean up all timers and intervals
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Close WebSocket connection properly
    if (wsRef.current) {
      // Remove event listeners to prevent memory leaks
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;

      if (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'Component unmounting');
      }
      wsRef.current = null;
    }
  };
}, [connect]);
```

**Key Points:**
- ✅ All event listeners removed before closing
- ✅ All timers and intervals cleared
- ✅ Proper close code (1000) sent
- ✅ References set to null for garbage collection

#### Connection Timeout
```typescript
const CONNECTION_TIMEOUT = 10000; // 10 seconds

connectionTimeoutRef.current = setTimeout(() => {
  if (ws.readyState !== WebSocket.OPEN) {
    console.log('Chat: Connection timeout');
    ws.close(1000, 'Connection timeout');
  }
}, CONNECTION_TIMEOUT);
```

**Prevents:**
- Hanging connections that never complete
- Zombie connections consuming resources

#### Max Reconnection Attempts
```typescript
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
  const delay = Math.min(
    RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttemptsRef.current),
    MAX_RECONNECT_DELAY
  );
  // Reconnect with exponential backoff
}
```

**Benefits:**
- ✅ Prevents infinite reconnection loops
- ✅ Exponential backoff reduces server load
- ✅ Clear error message when max attempts reached

#### Proper Connection Closure
```typescript
if (wsRef.current) {
  // Clean up existing connection properly
  wsRef.current.onclose = null;
  wsRef.current.onerror = null;
  wsRef.current.onmessage = null;
  wsRef.current.onopen = null;

  if (wsRef.current.readyState === WebSocket.OPEN ||
      wsRef.current.readyState === WebSocket.CONNECTING) {
    wsRef.current.close(1000, 'Reconnecting');
  }
  wsRef.current = null;
}
```

**Prevents:**
- Event listeners firing on closed connections
- Multiple connections to the same room
- Memory leaks from unreleased event handlers

### 2. Backend - Durable Object Cleanup

#### Automatic Session Cleanup
[cloudflare-workers/src/durable-objects/ChatRoom.ts](../cloudflare-workers/src/durable-objects/ChatRoom.ts)

```typescript
constructor(ctx: DurableObjectState, env: Env) {
  super(ctx, env);
  this.sessions = [];
  this.messageHistory = [];
  this.onlineUsers = new Map();

  // Clean up broken connections every 60 seconds
  this.cleanupInterval = setInterval(() => {
    this.cleanupBrokenSessions();
  }, 60000);
}

private cleanupBrokenSessions(): void {
  const before = this.sessions.length;

  this.sessions = this.sessions.filter(session => {
    if (session.quit) return false;

    try {
      // Check if WebSocket is still open
      if (session.webSocket.readyState !== 1) { // 1 = OPEN
        session.quit = true;
        this.onlineUsers.delete(session.userId);
        return false;
      }
      return true;
    } catch (err) {
      session.quit = true;
      this.onlineUsers.delete(session.userId);
      return false;
    }
  });

  const after = this.sessions.length;
  if (before !== after) {
    console.log(`Cleaned up ${before - after} broken sessions. Active: ${after}`);

    // Broadcast updated online users
    this.broadcast({
      type: "online_users",
      onlineUsers: Array.from(this.onlineUsers.values())
    });
  }
}
```

**What It Does:**
- ✅ Runs every 60 seconds automatically
- ✅ Checks each WebSocket's `readyState`
- ✅ Removes broken/closed connections
- ✅ Updates online users list
- ✅ Broadcasts changes to remaining users

#### Session Cleanup on Close/Error
```typescript
webSocket.addEventListener("close", () => {
  session.quit = true;
  this.sessions = this.sessions.filter(s => s !== session);
  this.onlineUsers.delete(userId);

  // Broadcast user left
  this.broadcast({
    type: "user_left",
    userId,
    userName,
    onlineUsers: Array.from(this.onlineUsers.values())
  });
});

webSocket.addEventListener("error", () => {
  session.quit = true;
  this.sessions = this.sessions.filter(s => s !== session);
  this.onlineUsers.delete(userId);
});
```

**Ensures:**
- Immediate cleanup on disconnect
- No stale sessions in memory
- Updated presence for all users

## Memory Leak Testing

### How to Test for Leaks

#### 1. Browser DevTools Memory Profiler

```bash
1. Open Chrome DevTools (F12)
2. Go to "Memory" tab
3. Take a heap snapshot
4. Use chat (send/receive messages)
5. Close chat
6. Take another snapshot
7. Compare snapshots - look for:
   - Detached WebSocket objects
   - Unreleased event listeners
   - Growing message arrays
```

#### 2. Connection Stress Test

```bash
# Test script
1. Open chat in 10 tabs
2. Send messages from each tab
3. Close 5 tabs randomly
4. Check backend logs for cleanup messages
5. Verify active session count decreases
6. Check remaining tabs still work
```

#### 3. Long-Running Test

```bash
# Leave chat open for extended period
1. Open chat
2. Let it run for 1+ hour
3. Monitor browser memory usage
4. Send occasional messages
5. Memory should remain stable
```

### Expected Behavior

✅ **Good Signs:**
- Memory usage plateaus after initial growth
- Cleanup logs appear in Durable Object
- WebSocket count matches active users
- No "detached" objects in heap snapshots

❌ **Warning Signs:**
- Continuously growing memory
- Multiple WebSocket connections per user
- Event listeners not decreasing
- Cleanup interval not running

## Performance Optimizations

### 1. Message History Limits

```typescript
// Keep only last 1000 messages
if (this.messageHistory.length > 1000) {
  this.messageHistory = this.messageHistory.slice(-1000);
}
```

**Benefits:**
- Prevents unlimited memory growth
- Keeps Durable Object storage manageable
- Faster message loads for new users

### 2. Ping/Pong Keep-Alive

```typescript
// Send ping every 30 seconds
pingIntervalRef.current = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000);
```

**Purpose:**
- Detects dead connections early
- Prevents proxy timeouts
- Ensures bidirectional communication

### 3. Exponential Backoff

```typescript
const delay = Math.min(
  RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttemptsRef.current),
  MAX_RECONNECT_DELAY
);
```

**Progression:**
- Attempt 1: 1 second
- Attempt 2: 2 seconds
- Attempt 3: 4 seconds
- Attempt 4: 8 seconds
- Attempt 5: 16 seconds (capped at 30s)

**Reduces:**
- Server load from rapid reconnects
- Network congestion
- Battery drain on mobile

## Monitoring & Alerts

### Backend Logs to Monitor

```bash
# Watch for cleanup activity
wrangler tail task-manager-api-dev --format pretty | grep -i "cleaned"

# Expected output:
# "Cleaned up 2 broken sessions. Active: 5"
```

### Metrics to Track

1. **Active WebSocket Connections**
   - Cloudflare Dashboard → Durable Objects → Analytics
   - Should match online user count

2. **Memory Usage**
   - Check Durable Object storage size
   - Should not exceed ~1MB per workspace

3. **Message Count**
   - Monitor `messageHistory.length`
   - Should cap at 1000

4. **Reconnection Rate**
   - High rate may indicate connectivity issues
   - Check network or server problems

## Troubleshooting

### Issue: Memory Keeps Growing

**Check:**
1. Are event listeners being removed?
2. Is cleanup interval running?
3. Are WebSockets being closed properly?

**Fix:**
```typescript
// Verify cleanup in useEffect return function
return () => {
  // All cleanup code here
};
```

### Issue: Too Many Reconnections

**Check:**
1. Network stability
2. Server-side errors
3. Authentication issues

**Fix:**
```typescript
// Check reconnect attempts
console.log(`Reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);
```

### Issue: Stale Online Users

**Check:**
1. Is cleanup interval running?
2. Are close events being handled?

**Fix:**
```typescript
// Manually trigger cleanup
this.cleanupBrokenSessions();
```

## Best Practices

### ✅ DO

- Always remove event listeners before closing
- Use refs for timers/intervals to ensure cleanup
- Implement connection timeouts
- Limit reconnection attempts
- Log cleanup activities
- Test with multiple concurrent users
- Monitor memory usage in production

### ❌ DON'T

- Create multiple connections per user
- Forget to clear timers/intervals
- Allow unlimited reconnections
- Store unlimited message history
- Ignore WebSocket errors
- Skip cleanup on component unmount

## Additional Features

### Sound Notifications

New message sounds implemented with proper cleanup:

```typescript
const playNotificationSound = () => {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  // ... sound generation ...

  oscillator.stop(audioContext.currentTime + 0.1);
  // AudioContext is garbage collected automatically
};
```

**Note:** No cleanup needed - browser handles AudioContext disposal

## Resources

- [WebSocket API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Durable Objects - Cloudflare](https://developers.cloudflare.com/durable-objects/)
- [Memory Leaks - Chrome DevTools](https://developer.chrome.com/docs/devtools/memory-problems/)
- [WebSocket Best Practices](https://www.ably.io/topic/websockets)

## Summary

The chat system implements comprehensive memory leak prevention through:

1. ✅ Proper event listener cleanup
2. ✅ Timer/interval management
3. ✅ Connection timeouts
4. ✅ Max reconnection limits
5. ✅ Automatic session cleanup
6. ✅ Message history limits
7. ✅ Keep-alive pings
8. ✅ Exponential backoff

All connections are properly cleaned up when:
- Component unmounts
- User closes chat
- Connection fails
- Max attempts reached
- WebSocket errors occur

Memory usage remains stable even with extended use! 🚀
