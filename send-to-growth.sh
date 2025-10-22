#!/bin/bash
API_URL="https://task-manager-api-dev.benjiemalinao879557.workers.dev"
EMAIL="benjiemalinao87@gmail.com"
PASSWORD="benjiemalinao87@gmail.com"

echo "🔐 Logging in as $EMAIL..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "✅ Login successful!"
echo ""
echo "📧 Sending invitation to iamgrowthmarketer@gmail.com..."

INVITE_RESPONSE=$(curl -s -X POST "$API_URL/api/onboarding/invite-colleagues" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"emails":["iamgrowthmarketer@gmail.com"]}')

echo "$INVITE_RESPONSE"
echo ""
echo "✅ Done! Check iamgrowthmarketer@gmail.com inbox in 1-2 minutes!"
echo "📬 From: Task Manager <task@customerconnects.app>"
