#!/bin/bash

# Test API Script for Task Manager Workers
# Make sure the dev server is running: npm run dev

API_URL="http://localhost:8787"
EMAIL="test@example.com"
PASSWORD="password123"

echo "🧪 Testing Task Manager API"
echo "=============================="
echo ""

# 1. Health Check
echo "1️⃣  Testing health check..."
HEALTH=$(curl -s "${API_URL}/health")
echo "Response: $HEALTH"
echo ""

# 2. Signup
echo "2️⃣  Creating test user..."
SIGNUP=$(curl -s -X POST "${API_URL}/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"name\":\"Test User\"}")

echo "Response: $SIGNUP"
echo ""

# 3. Login
echo "3️⃣  Logging in..."
LOGIN=$(curl -s -X POST "${API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

echo "Response: $LOGIN"
echo ""

# Extract token (requires jq)
if command -v jq &> /dev/null; then
  TOKEN=$(echo $LOGIN | jq -r '.token')

  if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
    echo "✅ Token received: ${TOKEN:0:20}..."
    echo ""

    # 4. Get current user
    echo "4️⃣  Getting current user info..."
    ME=$(curl -s "${API_URL}/api/auth/me" \
      -H "Authorization: Bearer $TOKEN")
    echo "Response: $ME"
    echo ""

    # 5. Create task
    echo "5️⃣  Creating a task..."
    TASK=$(curl -s -X POST "${API_URL}/api/tasks" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"taskName":"Test Task","description":"Testing the Cloudflare Workers API","estimatedTime":"1 hour"}')
    echo "Response: $TASK"
    echo ""

    # Extract task ID
    TASK_ID=$(echo $TASK | jq -r '.id')

    if [ "$TASK_ID" != "null" ] && [ ! -z "$TASK_ID" ]; then
      echo "✅ Task created with ID: $TASK_ID"
      echo ""

      # 6. Get tasks
      echo "6️⃣  Fetching all tasks..."
      TASKS=$(curl -s "${API_URL}/api/tasks" \
        -H "Authorization: Bearer $TOKEN")
      echo "Response: $TASKS"
      echo ""

      # 7. Complete task
      echo "7️⃣  Completing the task..."
      COMPLETE=$(curl -s -X PATCH "${API_URL}/api/tasks/${TASK_ID}" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"status":"completed","notes":"Task completed via API test"}')
      echo "Response: $COMPLETE"
      echo ""

      # 8. Get completed tasks
      echo "8️⃣  Fetching completed tasks..."
      COMPLETED=$(curl -s "${API_URL}/api/tasks?status=completed" \
        -H "Authorization: Bearer $TOKEN")
      echo "Response: $COMPLETED"
      echo ""

      # 9. Delete task
      echo "9️⃣  Deleting the task..."
      DELETE=$(curl -s -X DELETE "${API_URL}/api/tasks/${TASK_ID}" \
        -H "Authorization: Bearer $TOKEN")
      echo "Response: $DELETE"
      echo ""
    else
      echo "❌ Failed to create task"
    fi

    # 10. Logout
    echo "🔟 Logging out..."
    LOGOUT=$(curl -s -X POST "${API_URL}/api/auth/logout" \
      -H "Authorization: Bearer $TOKEN")
    echo "Response: $LOGOUT"
    echo ""

    # 11. Test unauthorized access
    echo "1️⃣1️⃣  Testing unauthorized access (should fail)..."
    UNAUTH=$(curl -s "${API_URL}/api/tasks" \
      -H "Authorization: Bearer invalid-token")
    echo "Response: $UNAUTH"
    echo ""

    echo "✅ All tests completed!"
  else
    echo "❌ Failed to get token. Check if user already exists or server is running."
  fi
else
  echo "⚠️  jq not installed. Install with: brew install jq"
  echo "Token: $LOGIN"
fi
