# 🔧 Environment Variables Setup

## For Local Development

Create `.env.local` in the project root:

```bash
# Use production API
VITE_API_BASE_URL=https://api.workoto.app
```

OR (if running local API):

```bash
# Use local API
VITE_API_BASE_URL=http://localhost:8787
```

---

## For Production Build

Create `.env.production` in the project root:

```bash
VITE_API_BASE_URL=https://api.workoto.app
```

---

## For Cloudflare Pages

In **Cloudflare Dashboard → Pages → task-manager → Settings → Environment variables**:

### Production Environment
```
Variable name: VITE_API_BASE_URL
Value: https://api.workoto.app
```

### Preview Environment (Optional)
```
Variable name: VITE_API_BASE_URL
Value: https://task-manager-api-dev.benjiemalinao879557.workers.dev
```

---

## Quick Commands

```bash
# Create local env file (use production API)
echo "VITE_API_BASE_URL=https://api.workoto.app" > .env.local

# Or create local env file (use local API)
echo "VITE_API_BASE_URL=http://localhost:8787" > .env.local

# Create production env file
echo "VITE_API_BASE_URL=https://api.workoto.app" > .env.production

# Test local development
npm run dev

# Build for production
npm run build
```

---

**Note:** After adding environment variables to Cloudflare Pages, you must **redeploy** for changes to take effect!

