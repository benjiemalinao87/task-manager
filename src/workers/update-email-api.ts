import { sendUpdateNotifications } from './send-update-notifications';

// API endpoint to trigger update emails
export async function handleUpdateEmailAPI(request: Request) {
  try {
    // Check if it's a POST request
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Method not allowed' 
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Optional: Add authentication/authorization check here
    // const authHeader = request.headers.get('Authorization');
    // if (!authHeader || !isValidAuth(authHeader)) {
    //   return new Response(JSON.stringify({ 
    //     success: false, 
    //     message: 'Unauthorized' 
    //   }), {
    //     status: 401,
    //     headers: { 'Content-Type': 'application/json' }
    //   });
    // }

    console.log('📧 Triggering update notification emails...');
    
    const result = await sendUpdateNotifications();
    
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in update email API:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Example usage in your main worker
// Add this route to your existing worker routes:
// 
// if (url.pathname === '/api/send-update-emails') {
//   return await handleUpdateEmailAPI(request);
// }
