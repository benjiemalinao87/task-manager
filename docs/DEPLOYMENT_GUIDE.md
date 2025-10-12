# Deployment Guide

## Pre-Deployment Checklist

### Environment Setup

- [ ] Cloudflare account created
- [ ] Wrangler CLI installed (`npm install -g wrangler`)
- [ ] Logged into Cloudflare (`wrangler login`)
- [ ] Domain configured in Cloudflare DNS
- [ ] Payment method added (for paid tier if needed)

### Database Setup

- [ ] D1 database created
- [ ] Schema migrated
- [ ] Data imported and verified
- [ ] Indexes created
- [ ] Test queries run successfully

### Secrets Configuration

- [ ] JWT_SECRET generated and stored
- [ ] OPENAI_API_KEY configured
- [ ] SENDGRID_API_KEY configured
- [ ] RESEND_API_KEY configured (if using)

### Code Ready

- [ ] All Workers migrated
- [ ] Authentication implemented
- [ ] Tests passing
- [ ] TypeScript compiling
- [ ] Build successful

---

## Step-by-Step Deployment

### Step 1: Deploy D1 Database

```bash
# Create production database
wrangler d1 create task-manager-prod

# Note the database ID from output
# Add to wrangler.toml under [production]

# Run schema migration
wrangler d1 execute task-manager-prod --file=./schema.sql --env=production

# Import data
wrangler d1 execute task-manager-prod --file=./d1_migration.sql --env=production

# Verify
wrangler d1 execute task-manager-prod --command="SELECT COUNT(*) FROM tasks;" --env=production
```

### Step 2: Create KV Namespace

```bash
# Create production KV namespace
wrangler kv:namespace create "KV" --env=production

# Note the ID from output
# Add to wrangler.toml
```

### Step 3: Create Queue

```bash
# Create email queue
wrangler queues create email-queue-prod

# Note the queue name
# Add to wrangler.toml
```

### Step 4: Configure Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Set secrets in production
wrangler secret put JWT_SECRET --env=production
wrangler secret put OPENAI_API_KEY --env=production
wrangler secret put SENDGRID_API_KEY --env=production

# Verify
wrangler secret list --env=production
```

### Step 5: Update wrangler.toml

```toml
name = "task-manager-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
node_compat = true

# ===================================
# DEVELOPMENT
# ===================================
[env.development]
name = "task-manager-api-dev"

[[env.development.d1_databases]]
binding = "DB"
database_name = "task-manager-dev"
database_id = "YOUR-DEV-DB-ID"

[[env.development.kv_namespaces]]
binding = "KV"
id = "YOUR-DEV-KV-ID"

[[env.development.queues.producers]]
binding = "EMAIL_QUEUE"
queue = "email-queue-dev"

# ===================================
# PRODUCTION
# ===================================
[env.production]
name = "task-manager-api"
routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]

[[env.production.d1_databases]]
binding = "DB"
database_name = "task-manager-prod"
database_id = "YOUR-PROD-DB-ID"

[[env.production.kv_namespaces]]
binding = "KV"
id = "YOUR-PROD-KV-ID"

[[env.production.queues.producers]]
binding = "EMAIL_QUEUE"
queue = "email-queue-prod"

[[env.production.queues.consumers]]
queue = "email-queue-prod"
max_batch_size = 10
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "email-dlq-prod"
```

### Step 6: Build Project

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build

# Test locally first
wrangler dev --env=development
```

### Step 7: Deploy API Workers

```bash
# Deploy to production
wrangler deploy --env=production

# Deploy queue consumer separately
wrangler deploy --name task-manager-email-consumer \\
  --env=production \\
  src/workers/queue-email-consumer.ts

# Verify deployment
curl https://api.yourdomain.com/health
```

### Step 8: Deploy Frontend (Cloudflare Pages)

```bash
# Navigate to frontend directory
cd /path/to/frontend

# Build production bundle
npm run build

# Deploy to Pages
wrangler pages deploy dist --project-name=task-manager

# Or connect to GitHub for auto-deploy
# Go to Cloudflare Dashboard > Pages > Create Project
# Connect your GitHub repo
# Set build command: npm run build
# Set output directory: dist
```

### Step 9: Configure DNS

```bash
# In Cloudflare Dashboard:
# DNS > Add record

# API subdomain
Type: CNAME
Name: api
Target: <your-worker-url>.workers.dev
Proxy: ON (orange cloud)

# Frontend
Type: CNAME
Name: @  (or www)
Target: <your-pages-url>.pages.dev
Proxy: ON
```

### Step 10: Enable SSL

```bash
# Cloudflare Dashboard > SSL/TLS
# Set to "Full (strict)"

# Enable:
# - Always Use HTTPS
# - Automatic HTTPS Rewrites
# - TLS 1.3

# Generate Origin Certificate for Pages (if needed)
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# API health
curl https://api.yourdomain.com/health

# Expected: {"status":"ok"}
```

### 2. Authentication Flow

```bash
# Signup
curl -X POST https://api.yourdomain.com/api/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{
    "email":"test@example.com",
    "password":"SecurePass123",
    "name":"Test User"
  }'

# Login
curl -X POST https://api.yourdomain.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email":"test@example.com",
    "password":"SecurePass123"
  }'

# Save the token from response
```

### 3. Protected Endpoints

```bash
TOKEN="your-jwt-token"

# Get tasks
curl https://api.yourdomain.com/api/tasks \\
  -H "Authorization: Bearer $TOKEN"

# Create task
curl -X POST https://api.yourdomain.com/api/tasks \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "taskName":"Test Task",
    "description":"Testing deployment",
    "estimatedTime":"1 hour"
  }'
```

### 4. Frontend Access

```bash
# Test frontend
curl https://yourdomain.com

# Should return HTML
```

### 5. Email Queue

```bash
# Check queue metrics in Cloudflare Dashboard
# Queues > email-queue-prod > Metrics

# Verify:
# - Messages being published
# - Messages being consumed
# - No stuck messages
```

---

## Monitoring Setup

### 1. Cloudflare Analytics

```bash
# Enable in Dashboard:
# - Workers Analytics
# - Pages Analytics
# - Security Analytics
```

### 2. Logging (LogPush)

```bash
# Set up Logpush for Workers
wrangler tail --env=production

# Or configure permanent logging:
# Dashboard > Analytics & Logs > Logs > Add Logpush
# Destination: S3, R2, or third-party (e.g., Datadog)
```

### 3. Error Tracking

**Option A: Sentry**

```bash
npm install @sentry/browser @sentry/node

# In Worker:
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: 'YOUR-SENTRY-DSN',
  environment: 'production'
});
```

**Option B: Cloudflare Workers Analytics**

Already included, view in Dashboard.

### 4. Uptime Monitoring

**Free Options:**
- UptimeRobot (https://uptimerobot.com)
- Pingdom Free Tier
- Cloudflare Health Checks (paid)

### 5. Alerts

```bash
# Set up alerts in Cloudflare Dashboard
# Workers > Your Worker > Triggers > Add Alert

# Alert conditions:
# - Error rate > 5%
# - Response time > 1000ms
# - CPU time exceeded
# - Daily request limit approaching
```

---

## Performance Optimization

### 1. Enable Caching

```typescript
// In Workers, cache GET requests
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cache = caches.default;
    let response = await cache.match(request);

    if (!response) {
      response = await handleRequest(request, env);
      // Cache for 5 minutes
      const cachedResponse = response.clone();
      cachedResponse.headers.set('Cache-Control', 'max-age=300');
      await cache.put(request, cachedResponse);
    }

    return response;
  }
};
```

### 2. Minimize Bundle Size

```bash
# Use tree-shaking
# Remove unused dependencies
# Minify code in production

# Check bundle size
wrangler dev --env=production --minify
```

### 3. Database Query Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- Use prepared statements (already done in Workers)
```

### 4. Rate Limiting

```typescript
// Implement rate limiting
const rateKey = `ratelimit:${userId}:${endpoint}`;
const requests = await env.KV.get(rateKey);

if (requests && parseInt(requests) > 100) {
  return new Response('Rate limit exceeded', { status: 429 });
}

await env.KV.put(rateKey, String(parseInt(requests || '0') + 1), {
  expirationTtl: 3600 // 1 hour
});
```

---

## Security Hardening

### 1. WAF Rules

```bash
# Enable in Cloudflare Dashboard
# Security > WAF > Create Rule

# Block common attacks:
# - SQL injection
# - XSS attempts
# - Known bad bots
```

### 2. Bot Protection

```bash
# Security > Bots
# Enable Bot Fight Mode or Super Bot Fight Mode
```

### 3. DDoS Protection

```bash
# Automatically enabled with Cloudflare
# Review settings:
# Security > DDoS
```

### 4. API Rate Limiting

```bash
# Security > API Shield
# Set rate limits per endpoint
```

### 5. CORS Configuration

```typescript
// Strict CORS in production
app.use('/*', cors({
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com'
  ], // No wildcards!
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));
```

---

## Backup Strategy

### 1. Database Backups

```bash
# Export D1 data regularly
wrangler d1 export task-manager-prod --output=backup-$(date +%Y%m%d).sql

# Store backups in R2 or external storage
# Automate with GitHub Actions or cron
```

### 2. KV Backups

```bash
# List all keys
wrangler kv:key list --namespace-id=YOUR-KV-ID

# Export important data
# (KV is ephemeral, only use for cache/sessions)
```

### 3. Automated Backups

```yaml
# .github/workflows/backup.yml
name: Daily Backup

on:
  schedule:
    - cron: '0 2 * * *' # 2 AM daily

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Backup D1
        run: |
          wrangler d1 export task-manager-prod \\
            --output=backup-$(date +%Y%m%d).sql
      - name: Upload to R2
        run: |
          wrangler r2 object put backups/backup-$(date +%Y%m%d).sql \\
            --file=backup-$(date +%Y%m%d).sql
```

---

## Rollback Procedure

### If Deployment Fails:

**Option 1: Rollback Workers**

```bash
# View deployment history
wrangler deployments list

# Rollback to previous version
wrangler rollback --message="Rolling back due to error"
```

**Option 2: Rollback Pages**

```bash
# In Cloudflare Dashboard:
# Pages > Your Project > Deployments
# Click on previous deployment
# Click "Rollback to this deployment"
```

**Option 3: Rollback Database**

```bash
# Restore from backup
wrangler d1 execute task-manager-prod --file=backup-20250112.sql

# Or point to old database
# Update wrangler.toml database_id to previous DB
# Deploy: wrangler deploy --env=production
```

---

## Troubleshooting

### Issue: 401 Unauthorized on all requests

**Solution:**
```bash
# Check JWT_SECRET is set
wrangler secret list --env=production

# Verify token is being sent
curl -v https://api.yourdomain.com/api/tasks \\
  -H "Authorization: Bearer YOUR-TOKEN"

# Check KV session exists
wrangler kv:key get "session:YOUR-TOKEN" --namespace-id=YOUR-KV-ID
```

### Issue: CORS errors

**Solution:**
```typescript
// Verify CORS headers in Worker
// Check browser console for specific error
// Ensure origin matches exactly (no trailing slash)
```

### Issue: Database queries failing

**Solution:**
```bash
# Check D1 binding in wrangler.toml
# Verify database_id is correct
# Test query directly:
wrangler d1 execute task-manager-prod \\
  --command="SELECT * FROM users LIMIT 1;" \\
  --env=production
```

### Issue: Queue messages not processing

**Solution:**
```bash
# Check queue consumer is deployed
wrangler deployments list

# View queue metrics
# Dashboard > Queues > email-queue-prod

# Check consumer logs
wrangler tail task-manager-email-consumer --env=production
```

---

## Maintenance

### Weekly Tasks

- [ ] Review error logs
- [ ] Check API performance metrics
- [ ] Verify backup completion
- [ ] Review security alerts

### Monthly Tasks

- [ ] Update dependencies
- [ ] Review and optimize slow queries
- [ ] Check storage usage (D1, KV, R2)
- [ ] Review costs and optimize

### Quarterly Tasks

- [ ] Security audit
- [ ] Load testing
- [ ] Update SSL certificates (auto-renewed)
- [ ] Review and update documentation

---

## Cost Monitoring

### View Usage

```bash
# Dashboard > Analytics & Logs > Workers Analytics
# Check:
# - Requests per day
# - CPU time
# - Duration
# - Errors

# Dashboard > D1 > Your Database > Metrics
# Check:
# - Read queries
# - Write queries
# - Storage used

# Dashboard > KV > Your Namespace > Metrics
# Check:
# - Read operations
# - Write operations
```

### Cost Optimization Tips

1. **Cache frequently accessed data in KV**
2. **Use batch operations for D1**
3. **Minimize Worker CPU time**
4. **Compress responses**
5. **Use Cloudflare CDN for static assets**

---

## Success Criteria

Your deployment is successful when:

- ✅ All API endpoints respond correctly
- ✅ Authentication works end-to-end
- ✅ Users can create and manage tasks
- ✅ Email notifications are sent
- ✅ Integrations work (Asana, etc.)
- ✅ Frontend loads and functions properly
- ✅ No errors in logs
- ✅ Response times < 200ms
- ✅ Monitoring and alerts configured
- ✅ Backups running automatically

---

## Next Steps After Deployment

1. **Announce Launch** - Notify users/beta testers
2. **Monitor Closely** - Watch for issues in first 24-48 hours
3. **Gather Feedback** - User testing and bug reports
4. **Iterate** - Fix issues, add features
5. **Scale** - Optimize as user base grows

---

**Last Updated:** 2025-10-12
