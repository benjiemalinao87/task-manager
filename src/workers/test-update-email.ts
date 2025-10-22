import { sendUpdateNotificationEmail } from './email-update-notification';

// Test function to send a single email
export async function testUpdateEmail() {
  const testUser = {
    id: 'test-user-123',
    email: 'your-email@example.com', // Replace with your email for testing
    name: 'Test User',
    workspace_id: 'test-workspace-123'
  };

  console.log('🧪 Testing update notification email...');
  
  try {
    const result = await sendUpdateNotificationEmail(testUser);
    
    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Check your inbox for the update notification email.');
    } else {
      console.error('❌ Failed to send test email:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    return { success: false, error };
  }
}

// Run this to test the email
// testUpdateEmail();
