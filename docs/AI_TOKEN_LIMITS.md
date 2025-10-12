# AI Token Limits & Pricing

## Overview

The Task Manager includes AI-powered task summaries using OpenAI GPT-3.5 Turbo. To ensure fair usage and manage costs, we implement token-based limits with different tiers.

---

## 🎯 Pricing Tiers

### Early Adopter Plan (Free)
- **Monthly AI Token Limit:** 100,000 tokens
- **Reset:** Every 30 days from signup
- **Features:**
  - ✅ Unlimited tasks
  - ✅ AI task summaries (up to limit)
  - ✅ Email notifications (via platform Resend)
  - ✅ Asana integration
  - ✅ Task history & reporting

### Pro Plan
- **Monthly AI Token Limit:** Unlimited
- **Features:**
  - ✅ Everything in Early Adopter
  - ✅ Unlimited AI summaries
  - ✅ Priority support
  - ✅ Advanced analytics (future)

---

## 📊 Token Usage Estimation

**Average tokens per task summary:**
- Short task (1-2 sentences): ~50-100 tokens
- Medium task (paragraph): ~100-200 tokens
- Long task (detailed): ~200-400 tokens

**Free tier capacity (100,000 tokens):**
- ~250-500 task summaries per month
- ~8-16 tasks with AI summaries per day

---

## 🔄 How Token Limits Work

### 1. Token Tracking
- Every AI summary request uses tokens
- OpenAI reports exact token usage per request
- Backend automatically tracks and deducts from your monthly quota

### 2. Monthly Reset
- Tokens reset 30 days after signup
- Automatic reset happens on first API call after reset date
- No manual action required

### 3. Limit Reached
When you exceed your 100k token limit:
```json
{
  "error": "AI token limit reached",
  "message": "You've used 100,000 of your 100,000 monthly AI tokens. Upgrade to Pro for unlimited access!",
  "tokensUsed": 100000,
  "tokensLimit": 100000,
  "resetAt": "2025-11-12T12:00:00.000Z"
}
```

### 4. After Limit
- Tasks still work normally
- AI summaries temporarily unavailable
- Manual task descriptions work fine
- Email notifications continue working

---

## 🛠 Implementation Details

### Database Schema

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  plan_name TEXT DEFAULT 'Early Adopter',
  ai_tokens_used INTEGER DEFAULT 0,
  ai_tokens_limit INTEGER DEFAULT 100000,
  ai_tokens_reset_at TEXT DEFAULT (datetime('now', '+30 days')),
  ...
);
```

### API Response (Successful Summary)

```json
{
  "success": true,
  "summary": "Build a responsive dashboard...",
  "tokensUsed": 142,
  "totalTokensUsed": 3452,
  "tokensRemaining": 96548,
  "tokensLimit": 100000
}
```

### Check Token Usage Endpoint

**GET** `/api/ai/token-usage`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "planName": "Early Adopter",
  "tokensUsed": 3452,
  "tokensLimit": 100000,
  "tokensRemaining": 96548,
  "resetAt": "2025-11-12T12:00:00.000Z",
  "percentageUsed": 3.45
}
```

**For Pro Users:**
```json
{
  "planName": "Pro",
  "tokensUsed": 250000,
  "tokensLimit": "unlimited",
  "tokensRemaining": "unlimited",
  "resetAt": "2025-11-12T12:00:00.000Z",
  "percentageUsed": 0
}
```

---

## 🚀 Upgrade Flow (Future)

### Step 1: Show Upgrade Prompt
When user reaches 80% of tokens:
```
⚠️ You've used 80,000 of 100,000 AI tokens
Upgrade to Pro for unlimited AI summaries!
[Upgrade Now]
```

### Step 2: Upgrade Endpoint (Future)
```
POST /api/billing/upgrade-to-pro
{
  "paymentMethod": "stripe_pm_xxx"
}
```

### Step 3: Update User Plan
```sql
UPDATE users 
SET plan_name = 'Pro', 
    ai_tokens_limit = -1  -- -1 = unlimited
WHERE id = ?
```

---

## 📈 Monitoring & Analytics

### Admin Dashboard Queries

**Total tokens used across all users:**
```sql
SELECT SUM(ai_tokens_used) as total_tokens
FROM users;
```

**Users approaching limit:**
```sql
SELECT email, ai_tokens_used, ai_tokens_limit,
       ROUND((ai_tokens_used * 100.0 / ai_tokens_limit), 2) as percentage_used
FROM users
WHERE plan_name != 'Pro'
  AND (ai_tokens_used * 100.0 / ai_tokens_limit) > 80
ORDER BY percentage_used DESC;
```

**Average tokens per user:**
```sql
SELECT AVG(ai_tokens_used) as avg_tokens_per_user
FROM users;
```

**Users who hit limit this month:**
```sql
SELECT COUNT(*) as users_at_limit
FROM users
WHERE plan_name != 'Pro'
  AND ai_tokens_used >= ai_tokens_limit;
```

---

## 💡 Frontend Integration

### Show Token Usage in UI

```typescript
// Fetch token usage
const response = await apiClient.getTokenUsage();

// Display in settings or task form
if (response.planName !== 'Pro') {
  const percentage = response.percentageUsed;
  const color = percentage > 80 ? 'red' : percentage > 50 ? 'yellow' : 'green';
  
  return (
    <div className={`token-usage ${color}`}>
      <p>AI Tokens: {response.tokensUsed} / {response.tokensLimit}</p>
      <ProgressBar value={percentage} />
      {percentage > 80 && (
        <button onClick={handleUpgrade}>Upgrade to Pro</button>
      )}
    </div>
  );
}
```

### Handle Limit Reached

```typescript
try {
  await apiClient.generateAISummary(taskId, taskName, description);
} catch (error) {
  if (error.status === 429) {
    // Token limit reached
    showUpgradeModal({
      message: error.message,
      tokensUsed: error.tokensUsed,
      resetAt: error.resetAt
    });
  }
}
```

---

## 🔒 Security Considerations

### 1. Token Manipulation Prevention
- All token tracking server-side only
- User cannot modify token counts
- OpenAI reports authoritative token usage

### 2. Rate Limiting
- Cloudflare Workers have built-in rate limiting
- Consider additional rate limits per user
- Prevent abuse of API endpoints

### 3. Multi-Tenancy
- Each user's tokens isolated by `user_id`
- No cross-user token leakage
- All queries filtered by authenticated user

---

## 📋 Testing Token Limits

### Test 1: Check Initial State
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8787/api/ai/token-usage
```

**Expected:**
```json
{
  "tokensUsed": 0,
  "tokensLimit": 100000,
  "tokensRemaining": 100000
}
```

### Test 2: Generate Summary
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"taskId":"123","taskName":"Test","description":"Test task"}' \
  http://localhost:8787/api/ai/generate-summary
```

**Expected:**
```json
{
  "success": true,
  "tokensUsed": 142,
  "totalTokensUsed": 142,
  "tokensRemaining": 99858
}
```

### Test 3: Manually Exceed Limit
```sql
-- Set user to 1 token remaining
UPDATE users 
SET ai_tokens_used = 99999 
WHERE email = 'test@example.com';
```

Then generate summary → Should return 429 error

### Test 4: Token Reset
```sql
-- Set reset date to past
UPDATE users 
SET ai_tokens_reset_at = datetime('now', '-1 day')
WHERE email = 'test@example.com';
```

Then generate summary → Should reset tokens and succeed

---

## 🎨 UI Components (Future)

### Token Usage Widget
```tsx
<TokenUsageWidget
  tokensUsed={3452}
  tokensLimit={100000}
  resetAt="2025-11-12"
  planName="Early Adopter"
  onUpgrade={() => navigate('/upgrade')}
/>
```

### Upgrade Modal
```tsx
<UpgradeModal
  currentTokens={85000}
  limit={100000}
  onUpgrade={handleUpgradeToPro}
  onClose={closeModal}
/>
```

---

## 💰 Cost Analysis

### Platform Costs (Your Resend + OpenAI)

**OpenAI Pricing:**
- GPT-3.5 Turbo: $0.50 per 1M input tokens
- Average summary: 150 tokens = $0.000075
- 100k tokens ≈ 666 summaries = $0.05

**Per User (Free Tier):**
- 100k tokens = ~$0.05-0.10 per month
- Very affordable to offer for free!

**Revenue from Pro Users:**
- Charge $10-20/month for unlimited
- Break even after 100-200 Pro users
- High profit margin

---

## 🚦 Future Enhancements

### Phase 1: Usage Analytics
- [ ] Track tokens per task
- [ ] Show usage history chart
- [ ] Email alerts at 80% usage

### Phase 2: Flexible Limits
- [ ] Admin can adjust per-user limits
- [ ] Temporary limit increases
- [ ] Team/organization plans

### Phase 3: Advanced Features
- [ ] Token purchase (pay-as-you-go)
- [ ] Different AI models (GPT-4 for Pro)
- [ ] Custom prompts for Pro users

---

## 📚 Resources

- **OpenAI Pricing:** https://openai.com/pricing
- **Token Counting:** https://platform.openai.com/tokenizer
- **Our API Docs:** `cloudflare-workers/README.md`
- **Schema:** `cloudflare-workers/schema.sql`

---

**Last Updated:** 2025-10-12
**Version:** 1.0

