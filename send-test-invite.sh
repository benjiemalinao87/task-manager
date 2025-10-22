#!/bin/bash

# Quick test script to send invitation email
API_URL="https://task-manager-api-dev.benjiemalinao879557.workers.dev"

echo "🚀 Sending test invitation email..."
echo ""

# Prompt for password securely
read -sp "Enter password for benjiemalinao87@gmail.com: " PASSWORD
echo ""
echo ""

# Login
echo "🔐 Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"benjiemalinao87@gmail.com\",\"password\":\"$PASSWORD\"}")

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo ""

# Send invitation
echo "📧 Step 2: Sending invitation to benjiemalinao87@gmail.com..."
INVITE_RESPONSE=$(curl -s -X POST "$API_URL/api/onboarding/invite-colleagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"emails":["benjiemalinao87@gmail.com"]}')

echo "✅ Invitation API called!"
echo ""
echo "📋 Response:"
echo "$INVITE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$INVITE_RESPONSE"
echo ""
echo "📬 Check your inbox at benjiemalinao87@gmail.com!"
echo "   From: Task Manager <task@customerconnects.app>"
echo "   Subject: Benjie Malinao invited you to Workoto - Boost your productivity together!"
echo ""
echo "✨ The invitation email should arrive within 1-2 minutes!"
