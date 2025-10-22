#!/bin/bash
# Simple test: Send invitation to benjiemalinao87@gmail.com

API_URL="https://task-manager-api-dev.benjiemalinao879557.workers.dev"
EMAIL="benjiemalinao87@gmail.com"

# Get password from command line argument
if [ -z "$1" ]; then
  echo "Usage: ./test-invite.sh YOUR_PASSWORD"
  exit 1
fi

PASSWORD="$1"

echo "🔐 Logging in as $EMAIL..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✅ Login successful!"
  echo ""
  echo "📧 Sending invitation to $EMAIL..."

  INVITE_RESPONSE=$(curl -s -X POST "$API_URL/api/onboarding/invite-colleagues" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"emails\":[\"$EMAIL\"]}")

  echo "$INVITE_RESPONSE"
  echo ""
  echo "✅ Done! Check $EMAIL inbox in 1-2 minutes!"
  echo "📬 From: Task Manager <task@customerconnects.app>"
  echo "📝 Subject: Benjie Malinao invited you to Workoto - Boost your productivity together!"
else
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
fi
