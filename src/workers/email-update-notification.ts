import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface User {
  id: string;
  email: string;
  name: string;
  workspace_id?: string;
}

export async function sendUpdateNotificationEmail(user: User) {
  const emailHtml = `
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
          transition: transform 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
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
        .social-links {
          margin: 20px 0;
        }
        .social-links a {
          color: #3b82f6;
          text-decoration: none;
          margin: 0 10px;
        }
        .unsubscribe {
          margin-top: 20px;
          font-size: 12px;
          color: #9ca3af;
        }
        .unsubscribe a {
          color: #9ca3af;
          text-decoration: none;
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
        <!-- Header -->
        <div class="header">
          <div class="logo">🚀 Workoto</div>
          <p class="header-subtitle">What's New in Your Productivity Hub</p>
        </div>

        <!-- Content -->
        <div class="content">
          <div class="greeting">
            Hi ${user.name || 'there'}! 👋<br>
            We've been busy making Workoto even better for you!
          </div>

          <!-- Features -->
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
              <p>Creating tasks is now fun! Watch the animated loading sequence: workoto...walking...workana! We've made productivity playful and engaging.</p>
            </div>
          </div>

          <!-- Special Highlight -->
          <div class="highlight">
            <h3>🎉 Bonus: Beautiful Notifications</h3>
            <p>We've replaced all those ugly browser alerts with beautiful, professional toast notifications. Your experience just got a major visual upgrade!</p>
          </div>

          <!-- Call to Action -->
          <div style="text-align: center;">
            <a href="https://workoto.app" class="cta-button">
              Try the New Features →
            </a>
          </div>

          <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
            Your productivity just got a major upgrade! 🚀
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="social-links">
            <a href="#">Twitter</a> •
            <a href="#">LinkedIn</a> •
            <a href="#">GitHub</a>
          </div>
          <p>Thanks for being part of the Workoto community!</p>
          <p>You're receiving this because you're a Workoto user.</p>
          <div class="unsubscribe">
            <a href="#">Unsubscribe</a> • 
            <a href="#">Update Preferences</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Workoto Team <updates@workoto.app>',
      to: [user.email],
      subject: 'Workoto Update: New Features & Improvements! 🚀',
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending update email:', error);
      return { success: false, error };
    }

    console.log('Update email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send update email:', error);
    return { success: false, error };
  }
}

// Function to send emails to all users
export async function sendUpdateNotificationToAllUsers() {
  try {
    // Get all users from your database
    // This is a placeholder - replace with your actual database query
    const users = await getUsersFromDatabase();
    
    const results = [];
    
    for (const user of users) {
      try {
        const result = await sendUpdateNotificationEmail(user);
        results.push({ user: user.email, success: result.success });
        
        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
        results.push({ user: user.email, success: false, error });
      }
    }
    
    return {
      success: true,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    console.error('Failed to send update notifications:', error);
    return { success: false, error };
  }
}

// Placeholder function - replace with your actual database query
async function getUsersFromDatabase(): Promise<User[]> {
  // Replace this with your actual database query
  // Example: return await db.query('SELECT id, email, name, workspace_id FROM users WHERE email_verified = true');
  return [];
}
