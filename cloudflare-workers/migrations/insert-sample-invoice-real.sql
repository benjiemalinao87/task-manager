-- Insert SAMPLE invoice for demonstration
-- Uses first existing user (benjiemalinao87@gmail.com)

-- Step 1: Insert invoice settings (if not exists)
INSERT OR IGNORE INTO invoice_settings (
  id, user_id, business_name, business_address, business_phone, business_email,
  tax_id, website, default_hourly_rate, default_currency, default_tax_rate,
  default_payment_terms, invoice_prefix, next_invoice_number,
  payment_instructions, bank_details
) VALUES (
  lower(hex(randomblob(16))),
  '5f304832-e8c3-4674-956c-374cf8b00518',
  '[SAMPLE] Demo Freelancing',
  '[SAMPLE] 123 Demo Street
Suite 100
Demo City, CA 90210',
  '+1 (555) 000-DEMO',
  'demo@sample-invoice.example',
  'XX-XXXXXXX',
  'https://sample-demo.example',
  75.00,
  'USD',
  8.5,
  'Net 30',
  'SAMPLE',
  2,
  '[SAMPLE DATA]

This is demonstration data showing how invoices work.

Payment methods:
- Bank Transfer
- PayPal
- Credit Card',
  '[SAMPLE]
Bank: Demo Bank
Account: Sample Company
Account #: XXXX-XXXX-1234
Routing #: XXXXXXXXX'
);

-- Step 2: Insert sample client
INSERT INTO clients (
  id, user_id, client_name, client_email, client_phone,
  client_address, client_company, notes, is_active
) VALUES (
  lower(hex(randomblob(16))),
  '5f304832-e8c3-4674-956c-374cf8b00518',
  '[SAMPLE] Demo Client',
  'demo@sample-client.example',
  '+1 (555) 111-DEMO',
  '[SAMPLE] 456 Client Ave
Demo Building
Client City, TX 12345',
  '[SAMPLE] Demo Corp',
  'This is SAMPLE data for demonstration purposes',
  1
);

-- Step 3: Insert SAMPLE invoice
INSERT INTO invoices (
  id, user_id, invoice_number, client_name, client_email,
  client_address, client_company, invoice_date, due_date,
  period_start, period_end, subtotal, tax_rate, tax_amount,
  discount_amount, total, currency, status, notes, payment_terms,
  share_token, created_at, updated_at
) VALUES (
  lower(hex(randomblob(16))),
  '5f304832-e8c3-4674-956c-374cf8b00518',
  'SAMPLE-2025-DEMO',
  '[SAMPLE] Demo Client',
  'demo@sample-client.example',
  '[SAMPLE] 456 Client Ave
Demo Building
Client City, TX 12345',
  '[SAMPLE] Demo Corp',
  '2025-10-01',
  '2025-11-01',
  '2025-09-01',
  '2025-09-30',
  3000.00,
  8.5,
  255.00,
  0,
  3255.00,
  'USD',
  'draft',
  '📋 SAMPLE INVOICE - For Demonstration

This is an example invoice showing how your invoices will appear. You can:

✓ Customize client information
✓ Add line items from completed tasks
✓ Set your own rates and terms
✓ Send via email or share link
✓ Track payment status',
  'Net 30 Days',
  'sample-demo-' || lower(hex(randomblob(8))),
  datetime('now'),
  datetime('now')
);

-- Step 4: Insert SAMPLE line items
INSERT INTO invoice_items (id, invoice_id, task_id, description, quantity, rate, amount, sort_order)
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM invoices WHERE invoice_number = 'SAMPLE-2025-DEMO'),
  NULL,
  '[SAMPLE] Website Design & Mockups',
  20.0,
  75.00,
  1500.00,
  1
UNION ALL
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM invoices WHERE invoice_number = 'SAMPLE-2025-DEMO'),
  NULL,
  '[SAMPLE] Frontend Development',
  15.0,
  75.00,
  1125.00,
  2
UNION ALL
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM invoices WHERE invoice_number = 'SAMPLE-2025-DEMO'),
  NULL,
  '[SAMPLE] API Integration',
  5.0,
  75.00,
  375.00,
  3;

-- Verification
SELECT '✅ SAMPLE INVOICE CREATED!' as message;
SELECT 'Invoice #: SAMPLE-2025-DEMO' as details;
SELECT 'Total: $3,255.00 (includes 8.5% tax)' as amount;
SELECT 'Status: Draft' as status;
SELECT '📌 This invoice is marked [SAMPLE] for demonstration' as note;
