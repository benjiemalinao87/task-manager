import { Context } from 'hono';

// Beautiful HTML email template
function getUpdateEmailHTML(userName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Workoto Update</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #f8fafc;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .header-subtitle {
          font-size: 16px;
          opacity: 0.9;
          margin: 0;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          color: #1f2937;
          margin-bottom: 30px;
        }
        .feature {
          display: flex;
          align-items: flex-start;
          margin-bottom: 30px;
          padding: 20px;
          background-color: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }
        .feature-icon {
          font-size: 24px;
          margin-right: 15px;
          margin-top: 5px;
        }
        .feature-content h3 {
          margin: 0 0 8px 0;
          color: #1f2937;
          font-size: 18px;
        }
        .feature-content p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }
        .highlight {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #f59e0b;
          border-radius: 12px;
          padding: 25px;
          margin: 30px 0;
          text-align: center;
        }
        .highlight h3 {
          color: #92400e;
          margin: 0 0 10px 0;
          font-size: 20px;
        }
        .highlight p {
          color: #92400e;
          margin: 0;
          font-size: 16px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          text-decoration: none;
          padding: 15px 30px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
          margin: 30px 0;
          text-align: center;
        }
        .footer {
          background-color: #f8fafc;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 5px 0;
          color: #6b7280;
          font-size: 14px;
        }
        @media (max-width: 600px) {
          .container {
            margin: 0;
            border-radius: 0;
          }
          .content {
            padding: 30px 20px;
          }
          .header {
            padding: 30px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚀 Workoto</div>
          <p class="header-subtitle">What's New in Your Productivity Hub</p>
        </div>

        <div class="content">
          <div class="greeting">
            Hi ${userName}! 👋<br>
            We've been busy making Workoto even better for you!
          </div>

          <div class="feature">
            <div class="feature-icon">💬</div>
            <div class="feature-content">
              <h3>Real-time Chat Feature</h3>
              <p>Collaborate instantly with your team! Ask questions, share updates, and get help in real-time. No more switching between apps - everything happens right in Workoto.</p>
            </div>
          </div>

          <div class="feature">
            <div class="feature-icon">👥</div>
            <div class="feature-content">
              <h3>Team Collaboration Tools</h3>
              <p>Invite team members, assign tasks, and track progress together. Workspace management with role-based permissions makes team coordination effortless.</p>
            </div>
          </div>

          <div class="feature">
            <div class="feature-icon">📅</div>
            <div class="feature-content">
              <h3>Calendar Integration</h3>
              <p>Visual task scheduling and time management. See your tasks in calendar view for better planning and never miss a deadline again.</p>
            </div>
          </div>

          <div class="feature">
            <div class="feature-icon">🎮</div>
            <div class="feature-content">
              <h3>Gamified Task Creation</h3>
              <p>Creating tasks is now fun! Watch the animated loading sequence: workoto...⚡...workana! We've made productivity playful and engaging.</p>
            </div>
          </div>

          <div class="highlight">
            <h3>🎉 Bonus: Beautiful Notifications</h3>
            <p>We've replaced all those ugly browser alerts with beautiful, professional toast notifications. Your experience just got a major visual upgrade!</p>
          </div>

          <div style="text-align: center;">
            <a href="https://www.workoto.app/" class="cta-button">
              Try the New Features →
            </a>
          </div>

          <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
            Your productivity just got a major upgrade! 🚀
          </p>
        </div>

        <div class="footer">
          <p>Thanks for being part of the Workoto community!</p>
          <p>You're receiving this because you're a Workoto user.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send update notification email via Resend
async function sendUpdateEmail(email: string, name: string, resendApiKey: string) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Workoto Team <updates@customerconnects.app>',
        to: [email],
        subject: 'Workoto Update: New Features & Improvements! 🚀',
        html: getUpdateEmailHTML(name),
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Resend error:', data);
      return { success: false, error: data };
    }

    console.log(`✅ Email sent successfully to ${email}`);
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Error sending email to ${email}:`, error);
    return { success: false, error };
  }
}

// Send test email
export async function sendTestUpdateEmail(c: Context) {
  try {
    const body = await c.req.json();
    const { email, name } = body;

    if (!email) {
      return c.json({ 
        success: false, 
        message: 'Email is required' 
      }, 400);
    }

    console.log(`📧 Sending test update email to ${email}...`);

    const result = await sendUpdateEmail(
      email,
      name || 'there',
      c.env.RESEND_API_KEY
    );

    if (result.success) {
      return c.json({
        success: true,
        message: `Test update email sent successfully to ${email}!`,
        data: result.data
      });
    } else {
      return c.json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      }, 500);
    }
  } catch (error) {
    console.error('❌ Error in sendTestUpdateEmail:', error);
    return c.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, 500);
  }
}

// Send to all users
export async function sendUpdateToAllUsers(c: Context) {
  try {
    console.log('🚀 Starting update notification email campaign...');

    // Get all users
    const users = await c.env.DB.prepare(`
      SELECT id, email, name 
      FROM users 
      WHERE email IS NOT NULL
      ORDER BY created_at DESC
    `).all();

    if (!users.results || users.results.length === 0) {
      return c.json({
        success: true,
        message: 'No users found',
        stats: { total: 0, sent: 0, failed: 0 }
      });
    }

    let sent = 0;
    let failed = 0;
    const results = [];

    for (const user of users.results) {
      try {
        const result = await sendUpdateEmail(
          user.email as string,
          user.name as string || 'there',
          c.env.RESEND_API_KEY
        );

        if (result.success) {
          sent++;
        } else {
          failed++;
        }

        results.push({
          email: user.email,
          success: result.success
        });

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to send to ${user.email}:`, error);
        failed++;
        results.push({
          email: user.email,
          success: false,
          error: error.message
        });
      }
    }

    return c.json({
      success: true,
      message: `Update emails sent! ${sent} successful, ${failed} failed.`,
      stats: {
        total: users.results.length,
        sent,
        failed,
        successRate: `${Math.round((sent / users.results.length) * 100)}%`
      },
      results
    });
  } catch (error) {
    console.error('❌ Error in sendUpdateToAllUsers:', error);
    return c.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, 500);
  }
}
