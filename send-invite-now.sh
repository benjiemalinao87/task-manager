#!/bin/bash

# Usage: ./send-invite-now.sh YOUR_PASSWORD

if [ -z "$1" ]; then
  echo "❌ Please provide your password as argument"
  echo "Usage: ./send-invite-now.sh YOUR_PASSWORD"
  exit 1
fi

API_URL="https://task-manager-api-dev.benjiemalinao879557.workers.dev"
PASSWORD="$1"

echo "🚀 Sending test invitation email to benjiemalinao87@gmail.com..."
echo ""

# Login
echo "🔐 Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"benjiemalinao87@gmail.com\",\"password\":\"$PASSWORD\"}")

# Check if login was successful by looking for "token" in response
if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then
  # Extract token using grep and sed
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  echo "✅ Login successful!"
  echo ""

  # Send invitation
  echo "📧 Step 2: Sending invitation..."
  INVITE_RESPONSE=$(curl -s -X POST "$API_URL/api/onboarding/invite-colleagues" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"emails":["benjiemalinao87@gmail.com"]}')

  echo "✅ Invitation sent!"
  echo ""
  echo "📋 Response:"
  echo "$INVITE_RESPONSE"
  echo ""
  echo "📬 Check your inbox at benjiemalinao87@gmail.com!"
  echo "   From: Task Manager <task@customerconnects.app>"
  echo "   Subject: Benjie Malinao invited you to Workoto - Boost your productivity together!"
  echo ""
  echo "✨ The email should arrive within 1-2 minutes!"
else
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi
