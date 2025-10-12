# 🌐 Domain Setup Guide for workoto.app

**Goal:** Set up proper domain routing for frontend and backend

---

## 🎯 Final Domain Structure

| Domain | Points To | Purpose |
|--------|-----------|---------|
| `workoto.app` | Cloudflare Pages | Landing page / Frontend |
| `www.workoto.app` | Cloudflare Pages | Landing page / Frontend |
| `api.workoto.app` | Cloudflare Workers | Backend API |

---

## 📋 Setup Steps

### Step 1: Update DNS Records

Go to Cloudflare Dashboard → `workoto.app` → DNS → Records

**Add this record:**
```
Type: CNAME
Name: api
Content: task-manager-api-dev.benjiemalinao879557.workers.dev
Proxy: ✅ Proxied (orange cloud)
TTL: Auto
```

**Your DNS should look like:**
```
CNAME   www    →  task-manager-978.pages.dev     (Proxied)
Worker  @      →  task-manager-api-dev            (Remove this!)
CNAME   api    →  task-manager-api-dev.*.workers.dev  (Proxied) ← NEW!
```

---

### Step 2: Update Cloudflare Pages Custom Domains

Go to: **Cloudflare Dashboard → Pages → task-manager → Custom domains**

**Should have both:**
- `workoto.app` ✅ Active
- `www.workoto.app` ✅ Active

If `workoto.app` is not there, click **"Set up a custom domain"** and add it.

---

### Step 3: Update Worker Custom Domain

Go to: **Cloudflare Dashboard → Workers & Pages → task-manager-api-dev → Settings → Domains & Routes**

**Current:**
- Custom domain: `workoto.app` ← **DELETE THIS!**

**After:**
- Custom domain: `api.workoto.app` ← **ADD THIS!**

**Steps:**
1. Click the trash icon next to `workoto.app` to remove it
2. Click **"Add"** → **"Custom domain"**
3. Enter: `api.workoto.app`
4. Click **"Add domain"**
5. Wait for SSL certificate (takes 1-2 minutes)

---

### Step 4: Update Frontend Environment Variables

**For Local Development:**

Create `/Users/allisonmalinao/Documents/task-manager/.env.local`:
```bash
VITE_API_BASE_URL=https://api.workoto.app
```

**For Production Build:**

Create `/Users/allisonmalinao/Documents/task-manager/.env.production`:
```bash
VITE_API_BASE_URL=https://api.workoto.app
```

**For Cloudflare Pages:**

1. Go to: **Cloudflare Dashboard → Pages → task-manager → Settings → Environment variables**
2. Click **"Add variables"**
3. Add for **Production**:
   - **Variable name:** `VITE_API_BASE_URL`
   - **Value:** `https://api.workoto.app`
4. Add for **Preview** (optional):
   - **Variable name:** `VITE_API_BASE_URL`
   - **Value:** `https://task-manager-api-dev.benjiemalinao879557.workers.dev`
5. Click **"Save"**

---

### Step 5: Update CORS in Worker

The worker needs to allow requests from `workoto.app` and `www.workoto.app`.

✅ This has been updated in the code already!

---

### Step 6: Redeploy Frontend

After adding environment variables to Cloudflare Pages:

1. Go to: **Cloudflare Dashboard → Pages → task-manager → Deployments**
2. Click **"···"** next to the latest deployment
3. Click **"Retry deployment"** or **"Manage deployment"** → **"Rollback to this deployment"**

Or push a new commit to trigger auto-deployment.

---

## 🧪 Testing

### Test Frontend (Pages)

```bash
# Should show your React app
curl -I https://workoto.app
curl -I https://www.workoto.app
```

**Expected:** 
- Status: `200 OK`
- Should see React app HTML

### Test API (Worker)

```bash
# Should show API health check
curl https://api.workoto.app/health
```

**Expected:**
```json
{"status":"ok","timestamp":"2025-10-12T..."}
```

### Test Full Flow

1. Visit `https://workoto.app`
2. Sign up / Login
3. Create a task
4. Check if it works!

---

## 🔧 Update Local Development

**Option 1: Use production API locally**

Create `.env.local`:
```bash
VITE_API_BASE_URL=https://api.workoto.app
```

Then:
```bash
npm run dev
```

**Option 2: Keep using local API**

Keep `.env.local` as:
```bash
VITE_API_BASE_URL=http://localhost:8787
```

And run local worker:
```bash
cd cloudflare-workers
npm run dev
```

---

## 📊 Architecture After Setup

```
┌─────────────────────────────────────────────────┐
│          User visits workoto.app                │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│     Cloudflare DNS (workoto.app)                │
│                                                 │
│  www.workoto.app    →  Cloudflare Pages        │
│  workoto.app        →  Cloudflare Pages        │
│  api.workoto.app    →  Cloudflare Workers      │
└─────────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ↓                   ↓
┌───────────────┐   ┌──────────────────┐
│ Frontend      │   │  Backend API     │
│ (Pages)       │   │  (Workers)       │
│               │   │                  │
│ React App     │──→│  /api/auth       │
│ Landing Page  │   │  /api/tasks      │
│               │   │  /api/settings   │
└───────────────┘   └──────────────────┘
```

---

## ✅ Verification Checklist

After completing all steps:

- [ ] `workoto.app` shows frontend (React app)
- [ ] `www.workoto.app` shows frontend (React app)
- [ ] `api.workoto.app/health` returns JSON
- [ ] Can sign up / login on `workoto.app`
- [ ] Can create tasks
- [ ] Emails are sent
- [ ] No CORS errors in browser console

---

## 🚨 Common Issues

### Issue 1: "Worker route still active"

**Problem:** Old worker route on `workoto.app` conflicts with Pages

**Solution:**
1. Go to `workoto.app` → DNS
2. Find the **Worker** route (not CNAME)
3. Delete it
4. Refresh DNS

### Issue 2: "SSL certificate pending"

**Problem:** `api.workoto.app` shows SSL error

**Solution:**
- Wait 1-2 minutes for Cloudflare to provision SSL
- Check: **Workers → task-manager-api-dev → Settings → Domains**
- Should show green checkmark next to `api.workoto.app`

### Issue 3: "API calls fail with 404"

**Problem:** Frontend can't reach API

**Solution:**
1. Check environment variable is set in Cloudflare Pages
2. Check CORS is allowing `workoto.app` (already done)
3. Redeploy Pages after adding environment variable

### Issue 4: "CORS error in browser"

**Problem:** Browser blocks API requests

**Solution:**
Check `cloudflare-workers/src/index.ts`:
```typescript
origin: [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://workoto.app',
  'https://www.workoto.app'
],
```

---

## 📝 Summary

**What we're doing:**
1. Moving API from `workoto.app` to `api.workoto.app`
2. Letting Pages use `workoto.app` and `www.workoto.app`
3. Updating frontend to call `api.workoto.app`

**Why:**
- Clean separation: Frontend and Backend on different subdomains
- No conflicts between Pages and Workers
- Professional setup (standard practice)
- Easier to manage and scale

---

**Last Updated:** October 12, 2025  
**Status:** Ready to implement  
**Estimated Time:** 10 minutes

