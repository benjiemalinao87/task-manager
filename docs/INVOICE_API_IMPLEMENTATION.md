# Invoice System - Backend API Implementation Guide

This document provides detailed specifications for implementing the backend API endpoints for the invoice management system in your Cloudflare Workers.

## Overview

The invoice system allows freelancers to:
- Generate invoices from completed tasks
- Customize invoice details (client info, rates, notes)
- Send invoices via email
- Generate shareable invoice links
- Track invoice status (draft, sent, paid, overdue)

## Database Schema

The migration script is available at: `cloudflare-workers/migrations/add-invoice-tables.sql`

Run this migration to add the following tables:
- `invoices` - Main invoice data
- `invoice_items` - Line items for each invoice
- `invoice_settings` - User's business settings
- `clients` - Client information storage

## API Endpoints to Implement

### 1. Invoice Endpoints

#### GET `/api/invoices`
Get all invoices for the authenticated user.

**Query Parameters:**
- `status` (optional): Filter by status (draft, sent, paid, overdue, cancelled)

**Response:**
```json
[
  {
    "id": "uuid",
    "invoice_number": "INV-2025-001",
    "client_name": "John Doe",
    "client_company": "Acme Inc",
    "invoice_date": "2025-10-01",
    "due_date": "2025-10-31",
    "period_start": "2025-10-01",
    "period_end": "2025-10-31",
    "subtotal": 1000.00,
    "tax_rate": 8.5,
    "tax_amount": 85.00,
    "discount_amount": 0,
    "total": 1085.00,
    "currency": "USD",
    "status": "draft",
    "created_at": "2025-10-14T10:00:00Z"
  }
]
```

#### GET `/api/invoices/:id`
Get a specific invoice with all items.

**Response:**
```json
{
  "id": "uuid",
  "invoice_number": "INV-2025-001",
  "client_name": "John Doe",
  "client_email": "john@example.com",
  "client_address": "123 Main St, City, State",
  "client_company": "Acme Inc",
  "invoice_date": "2025-10-01",
  "due_date": "2025-10-31",
  "period_start": "2025-10-01",
  "period_end": "2025-10-31",
  "subtotal": 1000.00,
  "tax_rate": 8.5,
  "tax_amount": 85.00,
  "discount_amount": 0,
  "total": 1085.00,
  "currency": "USD",
  "status": "draft",
  "notes": "Thank you for your business!",
  "payment_terms": "Net 30",
  "items": [
    {
      "id": "uuid",
      "task_id": "task-uuid",
      "description": "Website Development",
      "quantity": 20,
      "rate": 50.00,
      "amount": 1000.00
    }
  ],
  "created_at": "2025-10-14T10:00:00Z",
  "updated_at": "2025-10-14T10:00:00Z"
}
```

#### POST `/api/invoices`
Create a new invoice.

**Request Body:**
```json
{
  "clientName": "John Doe",
  "clientEmail": "john@example.com",
  "clientAddress": "123 Main St",
  "clientCompany": "Acme Inc",
  "invoiceDate": "2025-10-14",
  "dueDate": "2025-11-14",
  "periodStart": "2025-10-01",
  "periodEnd": "2025-10-31",
  "items": [
    {
      "taskId": "task-uuid",
      "description": "Website Development",
      "quantity": 20,
      "rate": 50.00
    }
  ],
  "taxRate": 8.5,
  "discountAmount": 0,
  "notes": "Thank you!",
  "paymentTerms": "Net 30"
}
```

**Implementation Notes:**
1. Generate unique invoice number from settings (prefix + year + sequential number)
2. Calculate subtotal from items (quantity * rate)
3. Calculate tax amount (subtotal * taxRate / 100)
4. Calculate total (subtotal + tax - discount)
5. Create invoice record
6. Create invoice_items records
7. Increment next_invoice_number in invoice_settings

**Response:**
```json
{
  "id": "uuid",
  "invoice_number": "INV-2025-001",
  "message": "Invoice created successfully"
}
```

#### PATCH `/api/invoices/:id`
Update an existing invoice.

**Request Body:** (all fields optional)
```json
{
  "status": "sent",
  "notes": "Updated notes",
  "dueDate": "2025-11-30"
}
```

#### DELETE `/api/invoices/:id`
Delete an invoice.

**Response:**
```json
{
  "message": "Invoice deleted successfully"
}
```

#### POST `/api/invoices/:id/send`
Send invoice via email.

**Request Body:**
```json
{
  "to": "client@example.com",
  "subject": "Invoice INV-2025-001",
  "message": "Please find attached your invoice."
}
```

**Implementation Notes:**
1. Get invoice details
2. Get user's invoice settings for business info
3. Generate email HTML with invoice details
4. Use existing Resend/SendGrid integration to send email
5. Update invoice: set status to 'sent', sent_at to current timestamp, sent_to to recipient email

**Response:**
```json
{
  "message": "Invoice sent successfully"
}
```

#### POST `/api/invoices/:id/share`
Generate a shareable link for the invoice.

**Implementation Notes:**
1. Generate a unique random token (use crypto.randomUUID() or similar)
2. Update invoice with share_token
3. Return shareable URL

**Response:**
```json
{
  "shareUrl": "https://yourapp.com/invoice/abc123token",
  "token": "abc123token"
}
```

#### GET `/api/invoices/share/:token`
Get invoice by share token (public endpoint - no auth required).

**Response:** Same as GET `/api/invoices/:id`

#### GET `/api/invoices/tasks`
Get completed tasks for a billing period.

**Query Parameters:**
- `period_start` (required): Start date (YYYY-MM-DD)
- `period_end` (required): End date (YYYY-MM-DD)

**Response:**
```json
[
  {
    "id": "uuid",
    "task_name": "Website Development",
    "description": "Built responsive website",
    "actual_time": "20 hours",
    "completed_at": "2025-10-15T14:30:00Z"
  }
]
```

**SQL Query:**
```sql
SELECT id, task_name, description, actual_time, completed_at
FROM tasks
WHERE user_id = ?
  AND status = 'completed'
  AND completed_at >= ?
  AND completed_at <= ?
ORDER BY completed_at DESC
```

### 2. Invoice Settings Endpoints

#### GET `/api/invoice-settings`
Get user's invoice settings.

**Response:**
```json
{
  "id": "uuid",
  "business_name": "My Business",
  "business_address": "123 Business St\nCity, State",
  "business_phone": "+1 555-1234",
  "business_email": "business@example.com",
  "tax_id": "12-3456789",
  "website": "https://mybusiness.com",
  "default_hourly_rate": 50.00,
  "default_currency": "USD",
  "default_tax_rate": 8.5,
  "default_payment_terms": "Net 30",
  "invoice_prefix": "INV",
  "next_invoice_number": 1,
  "payment_instructions": "Payment instructions here",
  "bank_details": "Bank details here"
}
```

**Implementation Notes:**
- If settings don't exist for user, create default settings first

#### PATCH `/api/invoice-settings`
Update invoice settings.

**Request Body:** (all fields optional)
```json
{
  "business_name": "Updated Business",
  "default_hourly_rate": 75.00,
  "default_tax_rate": 10.0
}
```

### 3. Client Endpoints

#### GET `/api/clients`
Get all clients for the authenticated user.

**Response:**
```json
[
  {
    "id": "uuid",
    "client_name": "John Doe",
    "client_email": "john@example.com",
    "client_company": "Acme Inc",
    "client_address": "123 Main St",
    "client_phone": "+1 555-9876",
    "is_active": true
  }
]
```

#### POST `/api/clients`
Create a new client.

**Request Body:**
```json
{
  "clientName": "John Doe",
  "clientEmail": "john@example.com",
  "clientCompany": "Acme Inc",
  "clientAddress": "123 Main St",
  "clientPhone": "+1 555-9876",
  "notes": "Preferred client"
}
```

#### PATCH `/api/clients/:id`
Update a client.

#### DELETE `/api/clients/:id`
Delete a client (soft delete by setting is_active = 0).

## Email Template

When sending invoices via email, use this HTML template structure:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice {{invoice_number}}</h1>
    </div>
    <div class="content">
      <p>Hi {{client_name}},</p>
      <p>{{custom_message}}</p>
      <p>Please find your invoice details below:</p>
      <ul>
        <li><strong>Invoice Number:</strong> {{invoice_number}}</li>
        <li><strong>Invoice Date:</strong> {{invoice_date}}</li>
        <li><strong>Due Date:</strong> {{due_date}}</li>
        <li><strong>Amount:</strong> {{total}}</li>
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{invoice_link}}" class="button">View Invoice</a>
      </p>
      <p>Thank you for your business!</p>
    </div>
    <div class="footer">
      <p>{{business_name}}<br>
      {{business_email}}<br>
      {{business_phone}}</p>
    </div>
  </div>
</body>
</html>
```

## Authentication

All endpoints (except `/api/invoices/share/:token`) require authentication via Bearer token:

```
Authorization: Bearer <token>
```

Extract user_id from the authenticated token to ensure data isolation.

## Error Handling

Return appropriate HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request (invalid data)
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

Error response format:
```json
{
  "error": "Error message here"
}
```

## Testing Checklist

- [ ] Create invoice with tasks
- [ ] Create invoice with custom items
- [ ] List invoices with status filter
- [ ] View invoice details
- [ ] Update invoice status
- [ ] Delete invoice
- [ ] Send invoice email
- [ ] Generate share link
- [ ] Access invoice via share link (no auth)
- [ ] Get billable tasks for period
- [ ] Update invoice settings
- [ ] Create and manage clients

## Next Steps

1. Implement all API endpoints in your Cloudflare Workers
2. Run the database migration
3. Test each endpoint with the frontend
4. Configure email integration (Resend/SendGrid)
5. Test the complete workflow: create invoice → send email → track status

## Additional Features (Future)

- PDF generation (server-side using puppeteer or similar)
- Recurring invoices
- Payment gateway integration (Stripe)
- Invoice reminders for overdue invoices
- Client portal for viewing all invoices
- Invoice analytics and reports
