# Email Configuration - Resend Integration

## ✅ What's Been Configured

Your Task Manager now uses a **tiered email system**:

### Default (Your Resend Account)
- **From Email**: `task@customerconnects.com`
- **Verified Domain**: `customerconnects.com`
- **API Key**: Set via `RESEND_API_KEY` secret
- **Usage**: All users by default get emails from YOUR Resend account

### User Override (Optional)
- Users can configure their own SendGrid or Resend in Settings
- If configured, their emails send from their own account
- If their integration fails, it does NOT fallback (by design)

---

## 🎯 How It Works

```
User creates/completes task
         │
         ▼
Email queued for sending
         │
         ▼
Check: Does user have custom integration?
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ▼         ▼
 Use their  Use YOUR
 SendGrid   Resend
 or Resend  (default)
    │         │
    └────┬────┘
         │
         ▼
  Email sent! ✅
```

---

## 📧 Email Types

The system sends 3 types of emails:

1. **Task Created** - When user creates a new task
2. **Task Completed** - When user completes a task
3. **Clock In** - When user clocks in

All emails have:
- Professional HTML templates
- Responsive design
- Task details and summaries
- Branding (customizable)

---

## 🔐 Set Your Resend API Key

Run this command to set YOUR Resend API key:

```bash
cd cloudflare-workers
wrangler secret put RESEND_API_KEY --env=development
```

**Where to get it:**
1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Give it "Sending access"
4. Copy the key

**Verify domain:**
Make sure `customerconnects.com` is verified in your Resend account at:
https://resend.com/domains

---

## 👥 User Plan Configuration

New signups automatically get:
- **Plan Name**: "Early Adopter"
- **Plan Badge**: Shown on signup page with 🎉
- **Benefits**: Full access to all features

The plan is stored in the `users.plan_name` column and can be changed later.

---

## 🎨 Branding

### Default Emails (Your Resend)
```
From: Task Manager <task@customerconnects.com>
Subject: Task Completed: [Task Name]
```

### User Custom Emails (if configured)
```
From: Task Manager <noreply@yourdomain.com>
Subject: Task Completed: [Task Name]
```

You can customize:
- From name: Update `DEFAULT_FROM_NAME` in `email-consumer.ts`
- From email: Update `DEFAULT_FROM_EMAIL` in `email-consumer.ts`
- Email templates: Edit the `buildTask*Email()` functions

---

## 🧪 Testing

### Test Default Resend

1. Sign up for a new account
2. Create a task
3. Check the email address you configured in settings
4. You should receive an email from `task@customerconnects.com`

### Test User Custom Integration

1. Go to Settings → Integrations
2. Add SendGrid or Resend API key
3. Mark it as active
4. Create a task
5. Email should come from the custom integration

---

## 📊 Database Changes

### Updated Tables

**users table:**
- Added `plan_name` column (default: "Early Adopter")

**integrations table:**
- Supports `sendgrid` and `resend` types
- `is_active` controls whether to use it
- One integration per type per user

---

## 🚀 Benefits

### For You (Platform Owner)
✅ Control default email sender
✅ One Resend account for all users
✅ Users benefit immediately without setup
✅ Professional emails from day one

### For Users
✅ Works out of the box (no setup needed)
✅ Can optionally use their own email service
✅ Flexibility to switch providers
✅ Professional email notifications

---

## 🔧 Configuration Files Updated

1. `schema.sql` - Added `plan_name` to users table
2. `email-consumer.ts` - Smart email routing logic
3. `Signup.tsx` - Shows "Early Adopter" badge
4. `SET_SECRETS.md` - Updated with Resend instructions
5. `wrangler.toml` - Comments updated

---

## 📝 Next Steps

1. **Set RESEND_API_KEY**:
   ```bash
   wrangler secret put RESEND_API_KEY --env=development
   ```

2. **Verify Domain**: 
   Make sure `customerconnects.com` is verified in Resend

3. **Test**: 
   Sign up → Create task → Check email

4. **Production**:
   When ready, set the production secret:
   ```bash
   wrangler secret put RESEND_API_KEY --env=production
   ```

---

**Last Updated:** 2025-10-12
**Email Provider:** Resend (customerconnects.com)
**Plan:** Early Adopter

