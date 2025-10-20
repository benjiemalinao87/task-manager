# 🔧 Wrangler CLI Limitations for Domain Setup

## ❌ What Wrangler CANNOT Do

### 1. DNS Records
**Command:** ❌ Not available in wrangler

**Why:** DNS management requires Cloudflare API or Dashboard

**Workaround:** Use Cloudflare Dashboard or Terraform

---

### 2. Custom Domains for Workers
**Command:** ❌ Not available in wrangler

**Why:** Custom domains are managed separately from routes

**What IS available:**
```bash
# You can add routes in wrangler.toml (but this requires the zone):
[[env.production.routes]]
pattern = "api.workoto.app/*"
zone_name = "workoto.app"
```

But this still requires:
- DNS record pointing to the worker
- Domain ownership verification

**Workaround:** Add via Dashboard → Workers & Pages → Settings → Domains & Routes

---

### 3. Environment Variables for Pages
**Command:** ❌ Not available in wrangler (for Pages projects)

**Why:** Pages are deployed via Git, env vars are set in Dashboard

**What IS available (for Workers only):**
```bash
# This works for Workers, but NOT for Pages:
wrangler secret put MY_SECRET
```

**Workaround:** Set via Dashboard → Pages → Settings → Environment variables

---

## ✅ What Wrangler CAN Do

### 1. Deploy Workers
```bash
cd cloudflare-workers
wrangler deploy --env development
wrangler deploy --env production
```

### 2. Manage Worker Secrets
```bash
# Set secrets for Workers
wrangler secret put JWT_SECRET --env development
wrangler secret put OPENAI_API_KEY --env development
wrangler secret put RESEND_API_KEY --env development

# List secrets
wrangler secret list --env development

# Delete secret
wrangler secret delete SECRET_NAME --env development
```

### 3. Manage D1 Database
```bash
# Create database
wrangler d1 create task-manager-prod

# Execute SQL
wrangler d1 execute task-manager-dev --local --file=schema.sql
wrangler d1 execute task-manager-dev --remote --file=schema.sql

# Query database
wrangler d1 execute task-manager-dev --remote --command="SELECT * FROM users LIMIT 5"
```

### 4. Manage KV Namespace
```bash
# Create KV namespace
wrangler kv:namespace create "KV" --env production

# Set value
wrangler kv:key put --binding=KV "my-key" "my-value" --env development

# Get value
wrangler kv:key get --binding=KV "my-key" --env development

# List keys
wrangler kv:key list --binding=KV --env development
```

### 5. Manage Queues
```bash
# Create queue
wrangler queues create email-queue-prod

# Send message (for testing)
wrangler queues producer send email-queue-dev '{"type":"test"}'

# List queues
wrangler queues list
```

### 6. View Logs
```bash
# Tail logs in real-time
wrangler tail --env development

# Pretty format
wrangler tail --env development --format pretty
```

### 7. Dev Server
```bash
# Run local dev server
wrangler dev

# With specific environment
wrangler dev --env development

# With remote D1 and KV
wrangler dev --remote
```

---

## 🎯 Quick Reference: What to Use for Each Task

| Task | Tool | Command/Location |
|------|------|------------------|
| Deploy Worker | Wrangler | `wrangler deploy` |
| Add DNS record | Dashboard | DNS → Records |
| Add custom domain | Dashboard | Workers → Settings → Domains |
| Set Worker secrets | Wrangler | `wrangler secret put` |
| Set Pages env vars | Dashboard | Pages → Settings → Environment variables |
| View logs | Wrangler | `wrangler tail` |
| Manage D1 | Wrangler | `wrangler d1` |
| Manage KV | Wrangler | `wrangler kv:*` |
| Manage Queues | Wrangler | `wrangler queues` |

---

## 📚 Resources

- [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Custom Domains Docs](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare API Docs](https://developers.cloudflare.com/api/)
- [Terraform Provider](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)

---

## 💡 Pro Tip: Infrastructure as Code

If you want to automate **everything** including DNS and custom domains, use:

### Option 1: Terraform
```hcl
# DNS Record
resource "cloudflare_record" "api" {
  zone_id = var.zone_id
  name    = "api"
  value   = "task-manager-api-dev.benjiemalinao879557.workers.dev"
  type    = "CNAME"
  proxied = true
}

# Worker Custom Domain
resource "cloudflare_worker_domain" "api" {
  account_id = var.account_id
  hostname   = "api.workoto.app"
  service    = "task-manager-api-dev"
  environment = "development"
}
```

### Option 2: Cloudflare API + curl/scripts

```bash
# Add DNS record via API
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "api",
    "content": "task-manager-api-dev.benjiemalinao879557.workers.dev",
    "proxied": true
  }'
```

But for quick one-time setup, **the Dashboard is fastest!**

