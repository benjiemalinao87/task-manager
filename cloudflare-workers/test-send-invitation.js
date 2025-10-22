/**
 * Test Script: Send Onboarding Invitation Email
 *
 * This script sends a test invitation email to verify the viral loop feature
 *
 * Usage:
 * node test-send-invitation.js
 */

const API_URL = 'https://task-manager-api-dev.benjiemalinao879557.workers.dev';

async function testSendInvitation() {
  console.log('🚀 Testing Onboarding Invitation Email...\n');

  // Step 1: Login to get JWT token
  console.log('Step 1: Logging in...');
  const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'benjiemalinao87@gmail.com',
      password: 'your-password-here', // ⚠️ Replace with actual password
    }),
  });

  if (!loginResponse.ok) {
    const error = await loginResponse.json();
    console.error('❌ Login failed:', error);
    console.log('\n⚠️  Please update the password in the script (line 23)');
    return;
  }

  const { token } = await loginResponse.json();
  console.log('✅ Login successful!\n');

  // Step 2: Send invitation
  console.log('Step 2: Sending invitation to benjiemalinao87@gmail.com...');
  const inviteResponse = await fetch(`${API_URL}/api/onboarding/invite-colleagues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      emails: ['benjiemalinao87@gmail.com'],
    }),
  });

  const inviteResult = await inviteResponse.json();

  if (!inviteResponse.ok) {
    console.error('❌ Invitation failed:', inviteResult);
    return;
  }

  console.log('✅ Invitation sent successfully!\n');
  console.log('📧 Results:');
  console.log(JSON.stringify(inviteResult, null, 2));
  console.log('\n📬 Check your email at benjiemalinao87@gmail.com!');
  console.log('   Look for an email from: Task Manager <task@customerconnects.app>');
  console.log('   Subject: "Benjie Malinao invited you to Workoto - Boost your productivity together!"');
}

// Run the test
testSendInvitation().catch(console.error);
