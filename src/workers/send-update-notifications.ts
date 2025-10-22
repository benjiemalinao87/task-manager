import { sendUpdateNotificationToAllUsers } from './email-update-notification';

export async function sendUpdateNotifications() {
  try {
    console.log('🚀 Starting update notification email campaign...');
    
    const result = await sendUpdateNotificationToAllUsers();
    
    if (result.success) {
      console.log(`✅ Update emails sent successfully!`);
      console.log(`📧 Total sent: ${result.totalSent}`);
      console.log(`❌ Total failed: ${result.totalFailed}`);
      
      return {
        success: true,
        message: `Update notification emails sent! ${result.totalSent} successful, ${result.totalFailed} failed.`,
        stats: {
          totalSent: result.totalSent,
          totalFailed: result.totalFailed,
          successRate: `${Math.round((result.totalSent / (result.totalSent + result.totalFailed)) * 100)}%`
        }
      };
    } else {
      console.error('❌ Failed to send update emails:', result.error);
      return {
        success: false,
        message: 'Failed to send update notification emails',
        error: result.error
      };
    }
  } catch (error) {
    console.error('❌ Error in sendUpdateNotifications:', error);
    return {
      success: false,
      message: 'Internal server error',
      error: error.message
    };
  }
}
