# Chat System Production Deployment Guide

## Pre-Deployment Checklist

✅ **Completed:**
- Durable Object class created ([ChatRoom.ts](../cloudflare-workers/src/durable-objects/ChatRoom.ts))
- API endpoints created ([chat.ts](../cloudflare-workers/src/workers/chat.ts))
- Durable Object bindings configured in wrangler.toml
- Frontend components built and integrated
- WebSocket hook implemented

## Deployment Steps

### 1. Deploy to Production

```bash
cd cloudflare-workers

# Deploy to production environment
wrangler deploy --env production
```

This will:
- Deploy the ChatRoom Durable Object
- Deploy the chat API endpoints
- Create the CHAT_ROOM binding
- Apply Durable Object migrations

### 2. Verify Deployment

After deployment, verify in Cloudflare Dashboard:

1. **Go to Workers & Pages** → `task-manager-api`
2. **Check Durable Objects:**
   - Navigate to "Durable Objects" tab
   - Verify "ChatRoom" appears in the list
3. **Check Settings:**
   - Navigate to "Settings" → "Bindings"
   - Verify "CHAT_ROOM" binding exists

### 3. Test the Chat System

#### Quick Test in Production:

1. **Open your app:** https://www.workoto.app
2. **Log in** to your account
3. **Look for the chat bubble** in the bottom-right corner
4. **Click the bubble** to open chat
5. **Send a test message**
6. **Open in another browser/incognito** and verify:
   - Real-time message delivery
   - Online presence indicator
   - Message history persistence

#### Multi-User Test:

1. **User 1:** Log in and open chat
2. **User 2:** Log in to the same workspace in different browser
3. **Verify:**
   - Both users see each other as online
   - Messages appear instantly for both users
   - Unread count updates correctly

### 4. Monitor Durable Object Activity

```bash
# View recent logs
wrangler tail --env production

# Filter for chat-related logs
wrangler tail --env production --format pretty | grep -i chat
```

In Cloudflare Dashboard:
- Workers & Pages → task-manager-api → Logs
- Analytics → Durable Objects

## Configuration Details

### Current Setup

**Development Environment:**
- Worker: `task-manager-api-dev`
- Durable Object Script: `task-manager-api-dev`
- Binding: `CHAT_ROOM` → `ChatRoom`

**Production Environment:**
- Worker: `task-manager-api`
- Durable Object Script: `task-manager-api`
- Binding: `CHAT_ROOM` → `ChatRoom`

### Migration Configuration

```toml
[migrations]
tag = "v1"
new_classes = ["ChatRoom"]
```

This migration will be automatically applied during deployment.

## Important Notes

### Durable Object Isolation

- **Each workspace gets its own Durable Object instance**
- Objects are created on-demand when users first connect
- Object ID is derived from workspace ID: `CHAT_ROOM.idFromName(workspaceId)`

### WebSocket Connections

- Frontend automatically connects via: `wss://api.workoto.app/api/chat/workspace/:workspaceId/connect`
- Connection requires valid JWT token
- Auto-reconnects on disconnect

### Storage & Persistence

- **Message History:** Last 1000 messages per workspace
- **Storage Location:** Durable Object storage (persistent)
- **No D1 Database Changes Required**

### Performance Considerations

- **Scalability:** Each workspace chat scales independently
- **Connection Limits:** Cloudflare handles WebSocket connections efficiently
- **Costs:** Minimal - Durable Objects are very cost-effective for this use case

## Rollback Plan

If you need to rollback:

```bash
# Revert to previous deployment
cd cloudflare-workers
wrangler rollback --env production

# Or deploy a specific version
wrangler versions deploy <version-id> --env production
```

## Troubleshooting

### Issue: Chat not connecting after deployment

**Solution:**
1. Check browser console for errors
2. Verify WebSocket URL is correct
3. Check that CHAT_ROOM binding exists in dashboard
4. Verify Durable Object is deployed

```bash
# Check deployment status
wrangler deployments list --env production
```

### Issue: Messages not persisting

**Solution:**
1. Check Durable Object storage in dashboard
2. Verify migration was applied
3. Check worker logs for errors

```bash
wrangler tail --env production
```

### Issue: Users can't see each other online

**Solution:**
1. Verify both users are in the same workspace
2. Check WebSocket connection status in DevTools
3. Verify authentication tokens are valid

### Issue: CORS errors in browser

**Solution:**
The CORS configuration in [index.ts](../cloudflare-workers/src/index.ts) should already include your domain. Verify:

```typescript
origin: [
  'https://workoto.app',
  'https://www.workoto.app'
]
```

## Post-Deployment Monitoring

### Key Metrics to Watch

1. **Durable Object Requests**
   - Dashboard → Analytics → Durable Objects
   - Watch for: Request count, duration, errors

2. **WebSocket Connections**
   - Dashboard → Analytics → Workers
   - Watch for: Connection count, duration

3. **Worker Invocations**
   - Chat API endpoints usage
   - Error rates

### Set Up Alerts (Optional)

In Cloudflare Dashboard:
1. Go to Notifications
2. Create alert for:
   - Worker error rate > 5%
   - Durable Object errors
   - Increased latency

## Security Checklist

✅ **Authentication:** Required for all chat endpoints
✅ **Workspace Isolation:** Users can only access their workspace chats
✅ **Token Verification:** JWT tokens verified on connection
✅ **CORS:** Properly configured for your domain
⚠️ **Message Encryption:** Messages are not end-to-end encrypted (consider for sensitive data)

## Cost Estimation

Based on typical usage:

**Durable Objects:**
- Requests: ~$0.15 per million requests
- Duration: ~$12.50 per million GB-seconds
- Storage: ~$0.20 per GB-month

**Estimated Cost for 100 active users:**
- ~10,000 WebSocket messages/day
- ~$0.01-0.05/day
- ~$0.30-1.50/month

Very affordable! 💰

## Support & Next Steps

### Documentation
- Full documentation: [CHAT_SYSTEM.md](CHAT_SYSTEM.md)
- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/

### Future Enhancements
- [ ] File sharing
- [ ] Message reactions
- [ ] Direct messages
- [ ] Push notifications
- [ ] Message search
- [ ] Video calls

## Deployment Command Summary

```bash
# Navigate to workers directory
cd cloudflare-workers

# Deploy to production
wrangler deploy --env production

# Verify deployment
wrangler deployments list --env production

# Monitor logs
wrangler tail --env production

# Test the chat!
# Open: https://www.workoto.app
```

Good luck with the deployment! 🚀
