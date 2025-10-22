import { sendUpdateNotificationToAllUsers } from './email-update-notification';

// This can be called from your API or triggered manually
export async function triggerUpdateEmails() {
  console.log('🚀 Starting to send update notification emails...');
  
  const result = await sendUpdateNotificationToAllUsers();
  
  if (result.success) {
    console.log(`✅ Successfully sent ${result.totalSent} emails`);
    console.log(`❌ Failed to send ${result.totalFailed} emails`);
    
    if (result.totalFailed > 0) {
      console.log('Failed emails:', result.results.filter(r => !r.success));
    }
  } else {
    console.error('❌ Failed to send update emails:', result.error);
  }
  
  return result;
}

// Example usage in your API endpoint
export async function handleUpdateEmailRequest() {
  try {
    const result = await triggerUpdateEmails();
    
    return {
      success: result.success,
      message: result.success 
        ? `Update emails sent successfully! ${result.totalSent} sent, ${result.totalFailed} failed.`
        : 'Failed to send update emails.',
      data: result
    };
  } catch (error) {
    console.error('Error in handleUpdateEmailRequest:', error);
    return {
      success: false,
      message: 'Internal server error',
      error: error.message
    };
  }
}
