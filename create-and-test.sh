#!/bin/bash
API_URL="https://task-manager-api-dev.benjiemalinao879557.workers.dev"

echo "🆕 Creating test user..."
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/signup" -H "Content-Type: application/json" -d '{"email":"testuser'$(date +%s)'@test.com","password":"test1234","name":"Test User"}')

echo "Response: $SIGNUP_RESPONSE"
echo ""

echo "🔐 Logging in with test user..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"testuser'$(date +%s)'@test.com","password":"test1234"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✅ Login successful!"
  echo ""
  echo "📧 Sending invitation to iamgrowthmarketer@gmail.com..."
  INVITE_RESPONSE=$(curl -s -X POST "$API_URL/api/onboarding/invite-colleagues" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"emails":["iamgrowthmarketer@gmail.com"]}')
  echo "$INVITE_RESPONSE"
  echo ""
  echo "✅ Done! Check iamgrowthmarketer@gmail.com inbox!"
else
  echo "❌ Login failed"
fi
