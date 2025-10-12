#!/bin/bash
# Quick Setup Script for workoto.app Domain Configuration
# Some steps require manual intervention in Cloudflare Dashboard

echo "🚀 Task Manager - Domain Setup Script"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  This script will guide you through the setup process.${NC}"
echo -e "${YELLOW}Some steps require manual action in Cloudflare Dashboard.${NC}"
echo ""

# Step 1: DNS Record
echo -e "${YELLOW}📋 STEP 1: Add DNS Record${NC}"
echo "-----------------------------------"
echo "❌ Cannot be automated with wrangler"
echo "✋ MANUAL ACTION REQUIRED:"
echo ""
echo "1. Go to: https://dash.cloudflare.com"
echo "2. Select domain: workoto.app"
echo "3. Go to: DNS → Records"
echo "4. Click 'Add record'"
echo "5. Add this record:"
echo "   Type: CNAME"
echo "   Name: api"
echo "   Content: task-manager-api-dev.benjiemalinao879557.workers.dev"
echo "   Proxy: Enabled (orange cloud ☁️)"
echo ""
read -p "Press Enter when you've added the DNS record..."
echo ""

# Step 2: Custom Domain for Worker
echo -e "${YELLOW}📋 STEP 2: Add Custom Domain to Worker${NC}"
echo "-----------------------------------"
echo "❌ Cannot be automated with wrangler"
echo "✋ MANUAL ACTION REQUIRED:"
echo ""
echo "1. Go to: https://dash.cloudflare.com"
echo "2. Go to: Workers & Pages → task-manager-api-dev"
echo "3. Go to: Settings → Domains & Routes"
echo "4. Click 'Add' → 'Custom domain'"
echo "5. Enter: api.workoto.app"
echo "6. Click 'Add domain'"
echo "7. Wait 1-2 minutes for SSL certificate"
echo ""
read -p "Press Enter when you've added the custom domain..."
echo ""

# Step 3: Test API
echo -e "${YELLOW}📋 STEP 3: Test API Domain${NC}"
echo "-----------------------------------"
echo "Testing api.workoto.app/health..."
echo ""

# Wait a moment for DNS to propagate
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://api.workoto.app/health)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ API is working! (HTTP $HTTP_CODE)${NC}"
    echo ""
    curl -s https://api.workoto.app/health | jq '.' 2>/dev/null || curl -s https://api.workoto.app/health
    echo ""
else
    echo -e "${RED}❌ API not responding yet (HTTP $HTTP_CODE)${NC}"
    echo "This is normal if you just added the domain."
    echo "Wait 2-3 minutes and try: curl https://api.workoto.app/health"
    echo ""
fi

# Step 4: Environment Variables for Pages
echo -e "${YELLOW}📋 STEP 4: Add Environment Variables to Pages${NC}"
echo "-----------------------------------"
echo "❌ Cannot be automated with wrangler (Pages project)"
echo "✋ MANUAL ACTION REQUIRED:"
echo ""
echo "1. Go to: https://dash.cloudflare.com"
echo "2. Go to: Workers & Pages → task-manager"
echo "3. Go to: Settings → Environment variables"
echo "4. Click 'Add variable'"
echo "5. For Production environment:"
echo "   Variable name: VITE_API_BASE_URL"
echo "   Value: https://api.workoto.app"
echo "6. (Optional) For Preview environment:"
echo "   Variable name: VITE_API_BASE_URL"
echo "   Value: https://task-manager-api-dev.benjiemalinao879557.workers.dev"
echo "7. Click 'Save'"
echo ""
read -p "Press Enter when you've added the environment variables..."
echo ""

# Step 5: Redeploy Pages
echo -e "${YELLOW}📋 STEP 5: Redeploy Pages${NC}"
echo "-----------------------------------"
echo "✋ MANUAL ACTION REQUIRED:"
echo ""
echo "1. Go to: https://dash.cloudflare.com"
echo "2. Go to: Workers & Pages → task-manager"
echo "3. Go to: Deployments"
echo "4. Click '···' next to latest deployment"
echo "5. Click 'Retry deployment'"
echo ""
read -p "Press Enter when you've triggered a redeploy..."
echo ""

# Final Check
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "======================================"
echo ""
echo "✅ Your domains should now be:"
echo "   Frontend: https://workoto.app"
echo "   Frontend: https://www.workoto.app"
echo "   API:      https://api.workoto.app"
echo ""
echo "🧪 Test your setup:"
echo "   curl https://api.workoto.app/health"
echo "   curl -I https://workoto.app"
echo ""
echo "📝 Next steps:"
echo "   1. Visit https://workoto.app"
echo "   2. Sign up / Login"
echo "   3. Create a test task"
echo "   4. Check your email for the AI summary!"
echo ""

