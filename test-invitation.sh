#!/bin/bash

# Test Script: Send Invitation Email
# Replace YOUR_PASSWORD with your actual password for benjiemalinao87@gmail.com

API_URL="https://task-manager-api-dev.benjiemalinao879557.workers.dev"
EMAIL="benjiemalinao87@gmail.com"
PASSWORD="YOUR_PASSWORD"  # ⚠️ Replace this!

echo "🚀 Testing Invitation Email Flow..."
echo ""

# Step 1: Login
echo "Step 1: Logging in as $EMAIL..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  echo ""
  echo "⚠️  Please update YOUR_PASSWORD in this script"
  exit 1
fi

echo "✅ Login successful!"
echo ""

# Step 2: Send invitation
echo "Step 2: Sending invitation to $EMAIL..."
INVITE_RESPONSE=$(curl -s -X POST "$API_URL/api/onboarding/invite-colleagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"emails":["benjiemalinao87@gmail.com"]}')

echo "✅ Invitation API called!"
echo ""
echo "📧 Response:"
echo "$INVITE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$INVITE_RESPONSE"
echo ""
echo "📬 Check your email at $EMAIL!"
echo "   From: Task Manager <task@customerconnects.app>"
echo "   Subject: Benjie Malinao invited you to Workoto..."
