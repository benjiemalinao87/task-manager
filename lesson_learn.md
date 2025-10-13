# Lessons Learned - Task Manager Migration

## Bug Fix: Email Notifications Not Sending (Oct 12, 2025)

### Problem
Users were creating tasks but not receiving email notifications, even though:
- RESEND_API_KEY was set
- Notification preferences were enabled
- Email queue consumer was working

### Root Cause
The signup function in `auth.ts` was not setting `default_email` when creating user settings.

**Buggy code:**
```typescript
await c.env.DB.prepare(`
  INSERT INTO settings (id, user_id, created_at, updated_at)
  VALUES (?, ?, ?, ?)
`).bind(settingsId, userId, now, now).run();
```

This caused `settings.default_email` to be `NULL`, which made the tasks worker skip sending emails:

```typescript
// In tasks.ts
const settings = await c.env.DB.prepare(
  'SELECT default_email FROM settings WHERE user_id = ?'
).bind(auth.userId).first();

// This condition fails if default_email is NULL
if (settings && settings.default_email) {
  await c.env.EMAIL_QUEUE.send({...});
}
```

### Solution
**Fixed code:**
```typescript
await c.env.DB.prepare(`
  INSERT INTO settings (id, user_id, default_email, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
`).bind(settingsId, userId, email.toLowerCase(), now, now).run();
```

**Migration for existing users:**
```sql
UPDATE settings 
SET default_email = (
  SELECT email FROM users WHERE users.id = settings.user_id
)
WHERE default_email IS NULL OR default_email = '';
```

### How to Avoid This
1. ✅ **Always set required fields during record creation** - Even if they can be updated later, set sensible defaults immediately
2. ✅ **Test the full user flow** - From signup → create task → receive email
3. ✅ **Add database constraints** - Consider `NOT NULL` constraints on critical fields like `default_email`
4. ✅ **Validate settings exist before using them** - Add defensive checks in business logic
5. ✅ **Use migrations for existing data** - When fixing bugs, don't forget existing users

### Deployment Steps
1. Fixed `auth.ts` to include `default_email` in INSERT
2. Deployed to Cloudflare: `wrangler deploy --env development`
3. Updated RESEND_API_KEY: `wrangler secret put RESEND_API_KEY --env development`
4. Migrated existing users: `wrangler d1 execute --remote --command "UPDATE settings..."`

### Verification
```sql
SELECT users.email, settings.default_email, settings.notify_task_created 
FROM users 
JOIN settings ON users.id = settings.user_id;
```

Expected output:
```
email: benjiemalinao87@gmail.com
default_email: benjiemalinao87@gmail.com ✓
notify_task_created: 1 ✓
```

### Testing Checklist
- [ ] Create a new user account
- [ ] Verify settings are created with default_email
- [ ] Create a task
- [ ] Verify email is sent to default_email
- [ ] Check email queue logs for any errors
- [ ] Complete a task
- [ ] Verify completion email is sent

---

## Key Takeaway
**When implementing signup/registration:**
1. Create all related records (user, settings, etc.) in a single transaction if possible
2. Set ALL important fields immediately, don't rely on later updates
3. Test the entire user journey, not just the signup endpoint
4. Have a migration strategy for existing users when fixing bugs

**Status:** ✅ Fixed and deployed  
**Version:** 68ee4832-e109-436a-b2fa-7e4f340acbf1  
**Date:** October 12, 2025

---

## Bug Fix: Wrong Email Domain (Oct 12, 2025)

### Problem
Emails were not being sent even though:
- RESEND_API_KEY was set correctly
- default_email was configured
- Email queue was working
- Notification preferences were enabled

### Root Cause
**Domain mismatch!** The code was trying to send from `task@customerconnects.com` but the verified domain in Resend was `customerconnects.app`.

**Buggy code:**
```typescript
const DEFAULT_FROM_EMAIL = 'task@customerconnects.com';  // Wrong!
```

**Resend verified domain:**
```json
{
  "name": "customerconnects.app",
  "status": "verified"
}
```

**Error:** Resend rejects emails from unverified domains, so all emails were silently failing.

### Solution
**Fixed code:**
```typescript
const DEFAULT_FROM_EMAIL = 'task@customerconnects.app';  // Correct!
```

### How to Avoid This
1. ✅ **Always verify domain in Resend first** - Before coding, check what domains you have
2. ✅ **Test email sending immediately** - Don't wait until user reports it
3. ✅ **Check Resend API response** - Add error logging for failed sends
4. ✅ **Document verified domains** - Keep a list of production-ready domains
5. ✅ **Use Resend dashboard** - Check "Emails" tab to see if any were attempted

### Verification
```bash
# Check verified domains
curl -X GET "https://api.resend.com/domains" \
  -H "Authorization: Bearer $RESEND_API_KEY"

# Look for:
# "status": "verified"
```

### Testing Checklist
- [ ] Create a new task
- [ ] Check email inbox (within 30 seconds)
- [ ] Complete a task
- [ ] Check email inbox again
- [ ] Check Resend dashboard for sent emails
- [ ] Check Cloudflare logs for any errors

**Status:** ✅ Fixed and deployed  
**Version:** 51a6d891-2789-42eb-ac20-ef345ada71db  
**Date:** October 12, 2025

---

## Bug Fix: AI Summary Not in Task Creation Emails (Oct 12, 2025)

### Problem
Task creation emails were being sent immediately without the AI summary, even though AI summaries were being generated and shown on task cards in the UI.

**User Experience:**
- UI showed AI summary on task card ✅
- Task completion email showed AI summary ✅
- **Task creation email had NO AI summary** ❌

### Root Cause
**Race condition!** The email was sent before the AI summary was generated.

**Buggy flow:**
```
1. Task created in database
2. AI summary generation triggered (async, "fire and forget")
3. Email sent immediately ← Email goes out without AI summary!
4. AI summary finishes later (but email already sent)
```

**Code showing the problem:**
```typescript
// In tasks.ts
const task = await DB.prepare('INSERT INTO tasks...').run();

// AI generation (async, doesn't wait)
c.executionCtx.waitUntil(
  fetch('/api/ai/generate-summary', {...})  // Fire and forget
);

// Email sent immediately (no AI summary yet!)
await EMAIL_QUEUE.send({
  type: 'task_created',
  task: {
    name: taskName,
    description,
    estimatedTime
    // ❌ No aiSummary!
  }
});
```

### Solution
**Move email sending to AFTER AI summary generation.**

**Fixed flow:**
```
1. Task created in database
2. AI summary generation triggered (async)
3. AI summary generated by OpenAI
4. AI summary saved to database
5. Email sent WITH AI summary ← Email now includes AI!
```

**Fixed code:**

**tasks.ts (removed immediate email):**
```typescript
const task = await DB.prepare('INSERT INTO tasks...').run();

// AI generation WITH email notification
c.executionCtx.waitUntil(
  fetch('/api/ai/generate-summary', {
    body: JSON.stringify({
      taskId,
      taskName,
      description,
      estimatedTime,
      sendEmail: true  // Tell AI worker to send email
    })
  })
);

// ✅ No immediate email, it will be sent after AI is done
```

**ai.ts (added email after summary):**
```typescript
// Generate AI summary
const summary = await openai.chat.completions.create({...});

// Save summary to database
await DB.prepare('UPDATE tasks SET ai_summary = ?').bind(summary).run();

// Send email WITH AI summary
if (sendEmail) {
  await EMAIL_QUEUE.send({
    type: 'task_created',
    task: {
      name: taskName,
      description,
      estimatedTime,
      aiSummary: summary  // ✅ AI summary included!
    }
  });
}
```

**email-consumer.ts (added AI summary to template):**
```typescript
// In buildTaskCreatedEmail()
<div class="task-name">${task.name}</div>

${task.aiSummary ? `
<div class="ai-summary-box">
  <strong>🤖 AI INSIGHT</strong>
  <p>${task.aiSummary}</p>
</div>
` : ''}
```

### How to Avoid This
1. ✅ **Understand async operations** - "fire and forget" means you don't wait for results
2. ✅ **Chain dependent operations** - If B depends on A, trigger B after A completes
3. ✅ **Test the entire flow** - Create task → Check email → Verify AI summary is there
4. ✅ **Add timing logs** - Log when each step happens to debug race conditions
5. ✅ **Consider user experience** - Is it better to send email quickly without AI, or wait 2-3 seconds for AI?

### Trade-offs

**Option 1: Send email immediately (old way)**
- ✅ Fast response
- ❌ No AI summary in email
- ❌ Incomplete information

**Option 2: Send email after AI (new way)**
- ✅ Complete information with AI insight
- ✅ Better user experience
- ⚠️ Email arrives 2-3 seconds later (acceptable)

**Decision:** Option 2 is better because AI insights are valuable and users expect them.

### Testing Checklist
- [ ] Create a new task
- [ ] Wait for AI summary to appear on task card (2-3 seconds)
- [ ] Check email inbox
- [ ] Verify email contains:
  - ✅ Task name
  - ✅ Description
  - ✅ Estimated time
  - ✅ **AI summary** with 🤖 icon
  - ✅ Beautiful blue box design
- [ ] Complete the task
- [ ] Verify completion email also has AI summary

### Performance Impact
**Before:** Email sent in ~100ms (but incomplete)  
**After:** Email sent in ~2-3 seconds (but complete with AI)  

**User doesn't notice because:**
- Email is async anyway (they check it later)
- 2-3 seconds is acceptable for email delivery
- The value of AI insights outweighs the delay

---

**Status:** ✅ Fixed and deployed  
**Version:** 197989ab-ebe5-4178-bdb9-981ef0597acc  
**Date:** October 12, 2025

---

## Bug Fix: Asana Tasks Not Being Assigned (Oct 12, 2025)

### Problem
Asana integration was creating tasks successfully and completing them, but tasks were **not being assigned** to the correct user in Asana.

**Symptoms:**
- ✅ Tasks created in Asana
- ✅ Tasks completed in Asana
- ❌ Tasks not assigned to anyone

### Root Cause
**Invalid email format in database!** The `default_assignee_email` in the `integrations` table config was missing the `@` symbol.

**Bad data in D1:**
```json
{
  "project_gid": "1206615013870411",
  "default_assignee_email": "benjiechannelautomation.com",  // ❌ Missing @
  "workspace_gid": "1204857085390737"
}
```

**Should be:**
```json
{
  "project_gid": "1206615013870411",
  "default_assignee_email": "benjie@channelautomation.com",  // ✅ Valid email
  "workspace_gid": "1204857085390737"
}
```

**Why this breaks assignment:**

The code in `tasks.ts` (lines 82-123) correctly:
1. Fetches all users from Asana workspace
2. Looks for a user whose email matches `default_assignee_email` (case-insensitive)
3. If found, sets `asanaPayload.data.assignee = user.gid`

However, when searching with `benjiechannelautomation.com`, no match is found because:
- Asana user emails are properly formatted: `user@domain.com`
- The search looks for exact match: `u.email?.toLowerCase() === assigneeEmail.toLowerCase()`
- `user@domain.com` !== `userdomain.com`

### Solution

**Step 1: Find your correct email in Asana**

First, check what email is associated with your Asana account:
```bash
# Using wrangler to query Asana
wrangler secret put ASANA_TOKEN --env development
# Then manually check Asana settings or use this query
```

Or check manually at: https://app.asana.com/0/my-settings → Profile

**Step 2: Update the D1 database**

```sql
-- Update the config JSON with correct email
UPDATE integrations
SET config = json_set(
  config,
  '$.default_assignee_email',
  'YOUR_CORRECT_EMAIL@domain.com'  -- Replace with your actual email
)
WHERE integration_type = 'asana'
AND user_id = 'YOUR_USER_ID';
```

**Step 3: Run via wrangler**

```bash
wrangler d1 execute task-manager-dev --remote --command "
UPDATE integrations
SET config = json_set(config, '$.default_assignee_email', 'benjie@channelautomation.com')
WHERE integration_type = 'asana';
"
```

**Step 4: Verify the fix**

```sql
SELECT id, user_id, integration_type, config
FROM integrations
WHERE integration_type = 'asana';
```

### How to Avoid This

1. ✅ **Add email validation in frontend** - When user enters Asana config, validate email format
2. ✅ **Validate on backend** - Check email format before saving to database
3. ✅ **Test assignee lookup** - When saving integration, immediately test if user can be found
4. ✅ **Better error messages** - Log when assignee lookup fails with available emails
5. ✅ **Auto-detect email** - Use Asana API to get current user's email automatically

### Code Improvements

**Add validation in integrations worker:**

```typescript
// In integrations.ts
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Before saving config
if (config.default_assignee_email && !isValidEmail(config.default_assignee_email)) {
  return c.json({ error: 'Invalid email format for assignee' }, 400);
}
```

**Better logging in tasks.ts (already present but worth highlighting):**

```typescript
// Line 111-112 shows available emails when lookup fails
console.log(`✗ User with email ${assigneeEmail} not found. Available emails:`,
  usersData.data?.filter((u: any) => u.email).map((u: any) => u.email).join(', '));
```

This helps debug email mismatches!

### Testing Checklist

After fixing the email:
- [ ] Create a new task in the app
- [ ] Check Asana project - task should appear
- [ ] Verify task is assigned to the correct user
- [ ] Check Cloudflare logs for "✓ Assigned task to user: ..."
- [ ] Complete the task in app
- [ ] Verify task is marked complete in Asana

### Key Takeaway

**When implementing third-party integrations:**
1. **Validate all input data** - Email, URLs, IDs, etc.
2. **Test integration immediately** - Don't wait until user reports issue
3. **Add helpful logging** - Show what the system is looking for vs what it found
4. **Fail gracefully** - If assignee not found, still create task (already doing this!)
5. **Guide users** - Consider fetching user email from Asana automatically

**The code was correct, the data was wrong!** This highlights the importance of input validation.

---

**Status:** ✅ Fixed - Changed to use `/users/me` API instead of email lookup  
**Date:** October 12, 2025

### Update: The Real Root Cause

After checking the actual database, the email was correctly stored with `@` symbol. The real issue was different:

**The Asana workspace users API doesn't expose email addresses!**

When querying `GET /workspaces/{gid}/users?opt_fields=email,name,gid`:
- ✅ Returns 343 users
- ❌ Email field is empty for all users (privacy/permissions)
- Result: Cannot match users by email

**Better Solution Implemented:**

Instead of looking up users by email, use the authenticated user directly:

```typescript
// OLD APPROACH (doesn't work)
const usersResponse = await fetch(
  `https://app.asana.com/api/1.0/workspaces/${workspaceGid}/users?opt_fields=email,name,gid`
);
const user = usersData.data?.find(u => u.email === assigneeEmail); // Always fails!

// NEW APPROACH (works!)
const meResponse = await fetch('https://app.asana.com/api/1.0/users/me', {
  headers: { 'Authorization': `Bearer ${api_key}` }
});
asanaPayload.data.assignee = userData.data.gid; // Always assigns to token owner
```

**Benefits:**
1. ✅ No email lookup needed
2. ✅ Always assigns to the API token owner (usually correct)
3. ✅ More reliable - no privacy/permission issues
4. ✅ Simpler code - one API call instead of searching through hundreds of users

**Files Changed:**
- `cloudflare-workers/src/workers/tasks.ts` - Lines 82-115

**Deployment:**
```bash
wrangler deploy --env development
# Version: 80530646-8fe4-48be-b9fe-d8dd185a9a81
```
