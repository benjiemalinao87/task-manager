# Task Manager - Cloudflare Workers API

Multi-tenant SaaS API built on Cloudflare's edge network.

## Features

✅ **Authentication** - JWT-based auth with bcrypt password hashing
✅ **Multi-tenancy** - Complete user isolation with user_id on all tables
✅ **Task Management** - CRUD operations for tasks
✅ **AI Summaries** - OpenAI GPT-3.5 task summaries
✅ **Email Notifications** - Async email queue with SendGrid
✅ **Zero Cold Starts** - Cloudflare Workers performance
✅ **Global Edge** - Deploy to 300+ locations worldwide

## Tech Stack

- **Runtime:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Cache/Sessions:** Cloudflare KV
- **Queue:** Cloudflare Queues
- **Framework:** Hono.js
- **Language:** TypeScript

## Project Structure

```
cloudflare-workers/
├── src/
│   ├── index.ts              # Main router
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   ├── middleware/
│   │   └── auth.ts           # Authentication middleware
│   ├── utils/
│   │   └── crypto.ts         # Helper functions
│   └── workers/
│       ├── auth.ts           # Auth endpoints (signup, login, logout)
│       ├── tasks.ts          # Tasks CRUD
│       ├── ai.ts             # AI summary generation
│       └── email-consumer.ts # Email queue consumer
├── schema.sql                # D1 database schema
├── package.json
├── tsconfig.json
├── wrangler.toml            # Cloudflare configuration
├── SETUP.md                 # Setup instructions
└── README.md                # This file
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Cloudflare Resources

Follow [SETUP.md](./SETUP.md) for detailed instructions.

Quick version:

```bash
# Login
wrangler login

# Create D1 database
wrangler d1 create task-manager-dev

# Create KV namespace
wrangler kv:namespace create "KV" --env development

# Create queue
wrangler queues create email-queue-dev

# Update wrangler.toml with the IDs from above commands

# Initialize database
wrangler d1 execute task-manager-dev --file=./schema.sql --env=development

# Set secrets
wrangler secret put JWT_SECRET --env=development
wrangler secret put OPENAI_API_KEY --env=development
wrangler secret put SENDGRID_API_KEY --env=development
```

### 3. Start Development Server

```bash
npm run dev
```

API will be available at `http://localhost:8787`

### 4. Test the API

```bash
# Health check
curl http://localhost:8787/health

# Signup
curl -X POST http://localhost:8787/api/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"password123","name":"Test"}'

# Login (save the token!)
curl -X POST http://localhost:8787/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"password123"}'

# Create task (use your token)
curl -X POST http://localhost:8787/api/tasks \\
  -H "Authorization: Bearer YOUR-TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"taskName":"Test","description":"Testing","estimatedTime":"1h"}'
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login and get JWT
- `POST /api/auth/logout` - Logout (invalidate session)
- `GET /api/auth/me` - Get current user info

### Tasks (Protected)

- `GET /api/tasks?status=in_progress` - List user's tasks
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks/:id` - Update/complete task
- `DELETE /api/tasks/:id` - Delete task

### AI

- `POST /api/ai/generate-summary` - Generate AI task summary

All protected endpoints require `Authorization: Bearer <token>` header.

## Deployment

### Deploy to Production

```bash
# Set up production environment (see SETUP.md)
wrangler d1 create task-manager-prod
wrangler kv:namespace create "KV" --env production
wrangler queues create email-queue-prod

# Update wrangler.toml with production IDs

# Set production secrets
wrangler secret put JWT_SECRET --env=production
wrangler secret put OPENAI_API_KEY --env=production
wrangler secret put SENDGRID_API_KEY --env=production

# Deploy
npm run deploy:prod
```

## Environment Variables

Set via `wrangler secret put <NAME>`:

- `JWT_SECRET` - Secret for signing JWTs (generate with `openssl rand -base64 32`)
- `OPENAI_API_KEY` - OpenAI API key for task summaries
- `SENDGRID_API_KEY` - SendGrid API key for emails
- `RESEND_API_KEY` - (Optional) Resend API key as alternative

## Database Schema

See [schema.sql](./schema.sql) for the complete schema.

Tables:
- `users` - User accounts
- `tasks` - User tasks with AI summaries
- `settings` - Per-user settings
- `time_sessions` - Clock in/out tracking
- `integrations` - API integrations (Asana, SendGrid, etc.)

## Security

✅ JWT-based authentication
✅ Bcrypt password hashing (10 salt rounds)
✅ User data isolation (all queries filtered by user_id)
✅ Secrets stored in Cloudflare (not in code)
✅ CORS configured
✅ Rate limiting ready (implement in middleware)

## Development

```bash
# Type checking
npm run typecheck

# View logs
wrangler tail --env=development

# Database commands
wrangler d1 execute task-manager-dev --command="SELECT * FROM users;" --env=development
```

## Monitoring

- **Analytics:** Cloudflare Dashboard > Workers > Analytics
- **Logs:** `wrangler tail` or Cloudflare Dashboard
- **D1 Metrics:** Cloudflare Dashboard > D1 > Your Database
- **Queue Metrics:** Cloudflare Dashboard > Queues

## Cost Estimate

### Free Tier (Development)
- D1: 5 GB, 5M reads/day
- Workers: 100K requests/day
- KV: 100K reads/day
- Queues: 1M operations/month

**Cost: $0/month**

### Paid Tier (Production)
- Workers Paid: $5/month (10M requests)
- D1: ~$1/month
- KV: ~$1/month
- Queues: Included

**Estimated: $10-15/month** (50-60% cheaper than Supabase Pro)

## Troubleshooting

See [SETUP.md](./SETUP.md) for common issues and solutions.

## Documentation

- [Main Migration Plan](../MIGRATION_PLAN.md)
- [Setup Guide](./SETUP.md)
- [Database Migration](../docs/DATABASE_MIGRATION.md)
- [Authentication](../docs/AUTHENTICATION_SETUP.md)

## License

MIT
