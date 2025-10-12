# Set Your API Keys

You need to set two more secrets. Run these commands and paste your API keys when prompted:

## OpenAI API Key

```bash
wrangler secret put OPENAI_API_KEY --env=development
```

**Where to get it:**
- Go to https://platform.openai.com/api-keys
- Click "Create new secret key"
- Copy the key and paste it when prompted

## Resend API Key (Default Email Provider)

```bash
wrangler secret put RESEND_API_KEY --env=development
```

**This is YOUR Resend account for:**
- Default sender: `task@customerconnects.com`
- Verified domain: `customerconnects.com`
- All users get emails from this by default

**Where to get it:**
- Go to https://resend.com/api-keys
- Click "Create API Key"
- Copy the key and paste it when prompted

**Note:** Users can optionally add their own SendGrid or Resend integration in settings, which will override the default.

## Verify Secrets Are Set

```bash
wrangler secret list --env=development
```

You should see:
- JWT_SECRET ✅
- OPENAI_API_KEY  
- RESEND_API_KEY ✅ (Your default email sender)

---

**After setting secrets, you can:**
1. Start the dev server: `npm run dev`
2. Test the API endpoints
3. Deploy to production

**Note:** If you don't have these services yet:
- OpenAI: You can skip for now, AI summaries just won't work
- Resend: **Required** for email notifications to work (this is YOUR account)

