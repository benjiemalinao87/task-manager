#!/bin/bash
API_URL="https://task-manager-api-dev.benjiemalinao879557.workers.dev"

echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"benjiemalinao87@gmail.com","password":"benjiemalinao87@gmail.com"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "✅ Logged in!"
echo ""
echo "📧 Sending invitation to ecommerce.spreadsimple@gmail.com..."

INVITE_RESPONSE=$(curl -s -X POST "$API_URL/api/onboarding/invite-colleagues" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"emails":["ecommerce.spreadsimple@gmail.com"]}')

echo "$INVITE_RESPONSE"
echo ""
echo "✅ Done! Check ecommerce.spreadsimple@gmail.com inbox in 1-2 minutes!"
echo "📬 From: Task Manager <task@customerconnects.app>"
echo "📝 Subject: Benjie Malinao invited you to Workoto - Boost your productivity together!"
