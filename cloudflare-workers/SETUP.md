# Cloudflare Workers Setup Guide

## Step 1: Login to Cloudflare

```bash
wrangler login
```

This will open your browser to authenticate with Cloudflare.

## Step 2: Create D1 Database (Development)

```bash
wrangler d1 create task-manager-dev
```

**Copy the output and update `wrangler.toml`:**
- Look for `database_id = "..."`
- Replace `YOUR-DEV-DB-ID` in wrangler.toml with the actual ID

## Step 3: Create KV Namespace (Development)

```bash
wrangler kv:namespace create "KV" --env development
```

**Copy the output and update `wrangler.toml`:**
- Look for `id = "..."`
- Replace `YOUR-DEV-KV-ID` in wrangler.toml with the actual ID

## Step 4: Create Email Queue (Development)

```bash
wrangler queues create email-queue-dev
```

The queue name `email-queue-dev` should match what's in wrangler.toml.

## Step 5: Initialize Database Schema

```bash
wrangler d1 execute task-manager-dev --file=./schema.sql --env=development
```

Verify tables were created:

```bash
wrangler d1 execute task-manager-dev --command="SELECT name FROM sqlite_master WHERE type='table';" --env=development
```

You should see: users, tasks, settings, time_sessions, integrations

## Step 6: Set Secrets

Generate a JWT secret:

```bash
openssl rand -base64 32
```

Set the secrets:

```bash
# JWT Secret (paste the generated secret when prompted)
wrangler secret put JWT_SECRET --env=development

# OpenAI API Key
wrangler secret put OPENAI_API_KEY --env=development

# SendGrid API Key
wrangler secret put SENDGRID_API_KEY --env=development
```

Verify secrets are set:

```bash
wrangler secret list --env=development
```

## Step 7: Test Locally

Start the development server:

```bash
npm run dev
```

The server should start on `http://localhost:8787`

## Step 8: Test API Endpoints

### Health Check
```bash
curl http://localhost:8787/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Signup
```bash
curl -X POST http://localhost:8787/api/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{
    "email":"test@example.com",
    "password":"password123",
    "name":"Test User"
  }'
```

Expected: `{"success":true,"userId":"...","message":"User created successfully"}`

### Login
```bash
curl -X POST http://localhost:8787/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email":"test@example.com",
    "password":"password123"
  }'
```

Expected: `{"token":"...","user":{...}}`

**Save the token for next requests!**

### Create Task (with auth)
```bash
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:8787/api/tasks \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "taskName":"Test Task",
    "description":"Testing the API",
    "estimatedTime":"1 hour"
  }'
```

### Get Tasks
```bash
curl http://localhost:8787/api/tasks \\
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### Issue: "Database not found"

**Solution:** Make sure you created the D1 database and updated the ID in wrangler.toml

```bash
wrangler d1 list
```

### Issue: "Unauthorized" on all requests

**Solution:** Check that JWT_SECRET is set

```bash
wrangler secret list --env=development
```

### Issue: "Queue not found"

**Solution:** Create the queue

```bash
wrangler queues list
wrangler queues create email-queue-dev
```

### Issue: "Cannot find module 'hono'"

**Solution:** Install dependencies

```bash
npm install
```

## Next Steps

Once local testing works:

1. Create production environment (repeat steps 2-6 with `--env=production`)
2. Update frontend to point to Workers API
3. Deploy to production with `npm run deploy:prod`

---

## Quick Reference Commands

```bash
# Development
npm run dev              # Start local dev server
npm run typecheck        # Check TypeScript types
wrangler tail            # View logs

# Database
wrangler d1 execute task-manager-dev --command="SELECT * FROM users;" --env=development

# Deployment
npm run deploy           # Deploy to dev
npm run deploy:prod      # Deploy to production

# Secrets
wrangler secret put <NAME> --env=development
wrangler secret list --env=development
```
