# Database Update - Add Plan Name

The users table needs a `plan_name` column to track user subscription plans.

## Update Local Database

```bash
wrangler d1 execute task-manager-dev --command="ALTER TABLE users ADD COLUMN plan_name TEXT DEFAULT 'Early Adopter';" --env=development
```

## Update Remote Database

```bash
wrangler d1 execute task-manager-dev --command="ALTER TABLE users ADD COLUMN plan_name TEXT DEFAULT 'Early Adopter';" --env=development --remote
```

## Verify

```bash
# Check local
wrangler d1 execute task-manager-dev --command="SELECT * FROM users LIMIT 1;" --env=development

# Check remote
wrangler d1 execute task-manager-dev --command="SELECT * FROM users LIMIT 1;" --env=development --remote
```

## What This Does

- All new signups will automatically get "Early Adopter" as their plan
- Existing users (if any) will also get "Early Adopter" as default
- You can change plan names later by updating this column

## Email Configuration

The system now:
1. **Uses YOUR Resend by default** (`task@customerconnects.com`)
2. Allows users to add their own SendGrid or Resend in settings
3. If user configures their own email provider, it overrides the default
4. Falls back to your Resend if user's integration fails

This means all users benefit from your email infrastructure by default! 🎉

