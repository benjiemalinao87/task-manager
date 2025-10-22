#!/bin/bash
API_URL="https://task-manager-api-dev.benjiemalinao879557.workers.dev"

echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"benjiemalinao87@gmail.com","password":"12341234"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✅ Login successful!"
  echo ""
  echo "📧 Sending invitation to iamgrowthmarketer@gmail.com..."
  curl -s -X POST "$API_URL/api/onboarding/invite-colleagues" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"emails":["iamgrowthmarketer@gmail.com"]}'
  echo ""
  echo ""
  echo "✅ Done! Check iamgrowthmarketer@gmail.com inbox!"
else
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
fi
