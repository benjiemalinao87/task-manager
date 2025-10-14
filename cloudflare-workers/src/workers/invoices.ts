import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';
import { generateId, getCurrentTimestamp } from '../utils/crypto';

const invoices = new Hono<{ Bindings: Env }>();

// GET /api/invoices - List user's invoices
invoices.get('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const url = new URL(c.req.url);
    const status = url.searchParams.get('status');

    let query = `
      SELECT * FROM invoices
      WHERE user_id = ?
    `;

    const params: any[] = [auth.userId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // For each invoice, also fetch its items
    const invoicesWithItems = await Promise.all(
      (result.results || []).map(async (invoice: any) => {
        const items = await c.env.DB.prepare(`
          SELECT * FROM invoice_items
          WHERE invoice_id = ?
          ORDER BY created_at ASC
        `).bind(invoice.id).all();

        return {
          ...invoice,
          items: items.results || []
        };
      })
    );

    return c.json(invoicesWithItems);

  } catch (error) {
    console.error('Get invoices error:', error);
    return c.json({ error: 'Failed to fetch invoices' }, 500);
  }
});

// GET /api/invoices/:id - Get single invoice
invoices.get('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const invoiceId = c.req.param('id');

    const invoice = await c.env.DB.prepare(`
      SELECT * FROM invoices
      WHERE id = ? AND user_id = ?
    `).bind(invoiceId, auth.userId).first();

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Fetch invoice items
    const items = await c.env.DB.prepare(`
      SELECT * FROM invoice_items
      WHERE invoice_id = ?
      ORDER BY created_at ASC
    `).bind(invoiceId).all();

    return c.json({
      ...invoice,
      items: items.results || []
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    return c.json({ error: 'Failed to fetch invoice' }, 500);
  }
});

// POST /api/invoices - Create new invoice
invoices.post('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const body = await c.req.json();
    const {
      invoice_number,
      client_name,
      client_company,
      client_email,
      client_address,
      invoice_date,
      due_date,
      period_start,
      period_end,
      subtotal,
      tax_rate,
      tax_amount,
      discount_amount,
      total,
      currency,
      status,
      payment_terms,
      notes,
      items
    } = body;

    // Validate required fields
    if (!invoice_number || !client_name || !invoice_date || !total) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Invoice must have at least one item' }, 400);
    }

    const invoiceId = generateId();
    const timestamp = getCurrentTimestamp();

    // Insert invoice
    await c.env.DB.prepare(`
      INSERT INTO invoices (
        id, user_id, invoice_number, client_name, client_company,
        client_email, client_address, invoice_date, due_date,
        period_start, period_end, subtotal, tax_rate, tax_amount,
        discount_amount, total, currency, status, payment_terms,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      invoiceId,
      auth.userId,
      invoice_number,
      client_name,
      client_company || null,
      client_email || null,
      client_address || null,
      invoice_date,
      due_date || null,
      period_start || null,
      period_end || null,
      subtotal || 0,
      tax_rate || 0,
      tax_amount || 0,
      discount_amount || 0,
      total,
      currency || 'USD',
      status || 'draft',
      payment_terms || null,
      notes || null,
      timestamp,
      timestamp
    ).run();

    // Insert invoice items
    for (const item of items) {
      const itemId = generateId();
      await c.env.DB.prepare(`
        INSERT INTO invoice_items (
          id, invoice_id, task_id, description, quantity,
          rate, amount, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        itemId,
        invoiceId,
        item.task_id || null,
        item.description,
        item.quantity || 1,
        item.rate || 0,
        item.amount || 0,
        timestamp
      ).run();
    }

    // Fetch the created invoice with items
    const createdInvoice = await c.env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ?
    `).bind(invoiceId).first();

    const invoiceItems = await c.env.DB.prepare(`
      SELECT * FROM invoice_items WHERE invoice_id = ?
    `).bind(invoiceId).all();

    return c.json({
      ...createdInvoice,
      items: invoiceItems.results || []
    }, 201);

  } catch (error) {
    console.error('Create invoice error:', error);
    return c.json({ error: 'Failed to create invoice' }, 500);
  }
});

// PATCH /api/invoices/:id - Update invoice
invoices.patch('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const invoiceId = c.req.param('id');
    const body = await c.req.json();

    // Check if invoice exists and belongs to user
    const existing = await c.env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ? AND user_id = ?
    `).bind(invoiceId, auth.userId).first();

    if (!existing) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    const allowedFields = [
      'invoice_number', 'client_name', 'client_company', 'client_email',
      'client_address', 'invoice_date', 'due_date', 'period_start',
      'period_end', 'subtotal', 'tax_rate', 'tax_amount', 'discount_amount',
      'total', 'currency', 'status', 'payment_terms', 'notes', 'sent_at'
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    // Add updated_at
    updates.push('updated_at = ?');
    values.push(getCurrentTimestamp());

    // Add WHERE clause parameters
    values.push(invoiceId);
    values.push(auth.userId);

    await c.env.DB.prepare(`
      UPDATE invoices
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `).bind(...values).run();

    // If items are provided, update them
    if (body.items && Array.isArray(body.items)) {
      // Delete existing items
      await c.env.DB.prepare(`
        DELETE FROM invoice_items WHERE invoice_id = ?
      `).bind(invoiceId).run();

      // Insert new items
      const timestamp = getCurrentTimestamp();
      for (const item of body.items) {
        const itemId = generateId();
        await c.env.DB.prepare(`
          INSERT INTO invoice_items (
            id, invoice_id, task_id, description, quantity,
            rate, amount, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          itemId,
          invoiceId,
          item.task_id || null,
          item.description,
          item.quantity || 1,
          item.rate || 0,
          item.amount || 0,
          timestamp
        ).run();
      }
    }

    // Fetch updated invoice
    const updated = await c.env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ?
    `).bind(invoiceId).first();

    const items = await c.env.DB.prepare(`
      SELECT * FROM invoice_items WHERE invoice_id = ?
    `).bind(invoiceId).all();

    return c.json({
      ...updated,
      items: items.results || []
    });

  } catch (error) {
    console.error('Update invoice error:', error);
    return c.json({ error: 'Failed to update invoice' }, 500);
  }
});

// DELETE /api/invoices/:id - Delete invoice
invoices.delete('/:id', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const invoiceId = c.req.param('id');

    // Check if invoice exists and belongs to user
    const existing = await c.env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ? AND user_id = ?
    `).bind(invoiceId, auth.userId).first();

    if (!existing) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Delete invoice items first (foreign key constraint)
    await c.env.DB.prepare(`
      DELETE FROM invoice_items WHERE invoice_id = ?
    `).bind(invoiceId).run();

    // Delete invoice
    await c.env.DB.prepare(`
      DELETE FROM invoices WHERE id = ? AND user_id = ?
    `).bind(invoiceId, auth.userId).run();

    return c.json({ message: 'Invoice deleted successfully' });

  } catch (error) {
    console.error('Delete invoice error:', error);
    return c.json({ error: 'Failed to delete invoice' }, 500);
  }
});

// POST /api/invoices/:id/share - Generate shareable link
invoices.post('/:id/share', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const invoiceId = c.req.param('id');

    // Check if invoice exists and belongs to user
    const invoice = await c.env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ? AND user_id = ?
    `).bind(invoiceId, auth.userId).first();

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Generate a unique share token
    const shareToken = generateId() + generateId(); // Extra long for security
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days

    // Store the share token in KV
    await c.env.KV.put(
      `invoice_share:${shareToken}`,
      JSON.stringify({
        invoiceId,
        userId: auth.userId,
        createdAt: getCurrentTimestamp(),
        expiresAt
      }),
      {
        expirationTtl: 90 * 24 * 60 * 60 // 90 days in seconds
      }
    );

    return c.json({
      token: shareToken,
      expiresAt
    });

  } catch (error) {
    console.error('Generate share link error:', error);
    return c.json({ error: 'Failed to generate share link' }, 500);
  }
});

// GET /api/invoices/public/:token - Public invoice view
invoices.get('/public/:token', async (c) => {
  try {
    const token = c.req.param('token');

    // Get share data from KV
    const shareData = await c.env.KV.get(`invoice_share:${token}`);

    if (!shareData) {
      return c.json({ error: 'Invalid or expired link' }, 404);
    }

    const { invoiceId, userId } = JSON.parse(shareData);

    // Fetch invoice
    const invoice = await c.env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ? AND user_id = ?
    `).bind(invoiceId, userId).first();

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Fetch invoice items
    const items = await c.env.DB.prepare(`
      SELECT * FROM invoice_items WHERE invoice_id = ?
    `).bind(invoiceId).all();

    // Fetch invoice settings for business info
    const settings = await c.env.DB.prepare(`
      SELECT * FROM invoice_settings WHERE user_id = ?
    `).bind(userId).first();

    return c.json({
      ...invoice,
      items: items.results || [],
      businessInfo: settings || null
    });

  } catch (error) {
    console.error('Public invoice view error:', error);
    return c.json({ error: 'Failed to fetch invoice' }, 500);
  }
});

// POST /api/invoices/:id/email - Send invoice via email
invoices.post('/:id/email', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const invoiceId = c.req.param('id');
    const body = await c.req.json();
    const { to, subject, message } = body;

    if (!to) {
      return c.json({ error: 'Recipient email is required' }, 400);
    }

    // Check if invoice exists and belongs to user
    const invoice = await c.env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ? AND user_id = ?
    `).bind(invoiceId, auth.userId).first();

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Fetch invoice items
    const items = await c.env.DB.prepare(`
      SELECT * FROM invoice_items WHERE invoice_id = ?
    `).bind(invoiceId).all();

    // Fetch business settings
    const settings = await c.env.DB.prepare(`
      SELECT * FROM invoice_settings WHERE user_id = ?
    `).bind(auth.userId).first();

    // Generate share link
    const shareToken = generateId() + generateId();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    await c.env.KV.put(
      `invoice_share:${shareToken}`,
      JSON.stringify({
        invoiceId,
        userId: auth.userId,
        createdAt: getCurrentTimestamp(),
        expiresAt
      }),
      {
        expirationTtl: 90 * 24 * 60 * 60
      }
    );

    // Get user info for from email
    const user = await c.env.DB.prepare(`
      SELECT name, email FROM users WHERE id = ?
    `).bind(auth.userId).first();

    // Build email HTML
    const businessName = settings?.business_name || user?.name || 'Your Business';
    const shareUrl = `${c.req.url.split('/api/')[0]}/invoice/${shareToken}`;

    const emailSubject = subject || `Invoice ${invoice.invoice_number} from ${businessName}`;
    const emailMessage = message || `Please find your invoice attached. You can view it online at: ${shareUrl}`;

    // Format currency
    const formatCurrency = (amount: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f3f4f6; font-weight: 600; }
          .total { font-size: 1.25rem; font-weight: bold; color: #2563eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice ${invoice.invoice_number}</h1>
            <p>${businessName}</p>
          </div>
          <div class="content">
            <p>${emailMessage}</p>

            <div class="invoice-details">
              <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
              <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Upon receipt'}</p>
              <p><strong>Amount Due:</strong> <span class="total">${formatCurrency(invoice.total, invoice.currency)}</span></p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(items.results || []).map((item: any) => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.rate, invoice.currency)}</td>
                    <td>${formatCurrency(item.amount, invoice.currency)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <a href="${shareUrl}" class="button">View Invoice Online</a>

            ${invoice.notes ? `<p><strong>Notes:</strong><br>${invoice.notes}</p>` : ''}
            ${settings?.payment_instructions ? `<p><strong>Payment Instructions:</strong><br>${settings.payment_instructions}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: settings?.business_email || user?.email || 'invoices@customerconnects.com',
        to: [to],
        subject: emailSubject,
        html: emailHtml
      })
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error('Email send error:', error);
      return c.json({ error: 'Failed to send email' }, 500);
    }

    // Update invoice sent_at timestamp
    await c.env.DB.prepare(`
      UPDATE invoices
      SET sent_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(getCurrentTimestamp(), getCurrentTimestamp(), invoiceId).run();

    return c.json({
      message: 'Invoice sent successfully',
      shareUrl
    });

  } catch (error) {
    console.error('Send invoice email error:', error);
    return c.json({ error: 'Failed to send invoice' }, 500);
  }
});

// GET /api/invoices/settings - Get invoice settings
invoices.get('/settings/get', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    let settings = await c.env.DB.prepare(`
      SELECT * FROM invoice_settings WHERE user_id = ?
    `).bind(auth.userId).first();

    // If no settings exist, create default ones
    if (!settings) {
      const settingsId = generateId();
      const timestamp = getCurrentTimestamp();

      await c.env.DB.prepare(`
        INSERT INTO invoice_settings (
          id, user_id, business_name, business_email, currency,
          default_hourly_rate, tax_rate, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        settingsId,
        auth.userId,
        null,
        null,
        'USD',
        50.00,
        0,
        timestamp,
        timestamp
      ).run();

      settings = await c.env.DB.prepare(`
        SELECT * FROM invoice_settings WHERE id = ?
      `).bind(settingsId).first();
    }

    return c.json(settings);

  } catch (error) {
    console.error('Get invoice settings error:', error);
    return c.json({ error: 'Failed to fetch settings' }, 500);
  }
});

// PATCH /api/invoices/settings - Update invoice settings
invoices.patch('/settings/update', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const body = await c.req.json();

    // Check if settings exist
    let existing = await c.env.DB.prepare(`
      SELECT * FROM invoice_settings WHERE user_id = ?
    `).bind(auth.userId).first();

    if (!existing) {
      // Create settings if they don't exist
      const settingsId = generateId();
      const timestamp = getCurrentTimestamp();

      await c.env.DB.prepare(`
        INSERT INTO invoice_settings (
          id, user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?)
      `).bind(settingsId, auth.userId, timestamp, timestamp).run();

      existing = await c.env.DB.prepare(`
        SELECT * FROM invoice_settings WHERE id = ?
      `).bind(settingsId).first();
    }

    const allowedFields = [
      'business_name', 'business_email', 'business_phone', 'business_address',
      'tax_id', 'currency', 'default_hourly_rate', 'tax_rate',
      'payment_instructions', 'bank_details'
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    updates.push('updated_at = ?');
    values.push(getCurrentTimestamp());
    values.push(auth.userId);

    await c.env.DB.prepare(`
      UPDATE invoice_settings
      SET ${updates.join(', ')}
      WHERE user_id = ?
    `).bind(...values).run();

    const updated = await c.env.DB.prepare(`
      SELECT * FROM invoice_settings WHERE user_id = ?
    `).bind(auth.userId).first();

    return c.json(updated);

  } catch (error) {
    console.error('Update invoice settings error:', error);
    return c.json({ error: 'Failed to update settings' }, 500);
  }
});

export default invoices;
