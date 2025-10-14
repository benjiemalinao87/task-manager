-- Insert MOCK sample invoice data
-- This creates a sample invoice with fictional data for demonstration

-- Generate a mock user ID for the sample
-- Step 1: Insert mock invoice settings
INSERT INTO invoice_settings (
  id, user_id, business_name, business_address, business_phone, business_email,
  tax_id, website, default_hourly_rate, default_currency, default_tax_rate,
  default_payment_terms, invoice_prefix, next_invoice_number,
  payment_instructions, bank_details
) VALUES (
  'mock-settings-id-12345',
  'mock-user-demo-sample',
  'Demo Freelancing Co.',
  '456 Demo Street
Suite 200
Demo City, CA 90210',
  '+1 (555) 000-1234',
  'demo@example.com',
  '99-9999999',
  'https://demo-freelancing.example.com',
  50.00,
  'USD',
  10.0,
  'Net 30',
  'DEMO',
  2,
  'This is a SAMPLE INVOICE for demonstration purposes.

Payment methods:
- Bank Transfer
- Credit Card
- PayPal

Please include invoice number in your payment.',
  'Demo Bank
Account: Demo Freelancing Co.
Account #: 9876543210
Routing #: 123456789
SWIFT: DEMOBANK'
);

-- Step 2: Insert mock client
INSERT INTO clients (
  id, user_id, client_name, client_email, client_phone,
  client_address, client_company, notes, is_active
) VALUES (
  'mock-client-id-12345',
  'mock-user-demo-sample',
  'John Demo',
  'john@democlient.example',
  '+1 (555) 111-2222',
  '789 Client Avenue
Building 5
Client City, TX 73301',
  'Demo Client Corp.',
  'Sample client for demonstration',
  1
);

-- Step 3: Insert mock sample invoice
INSERT INTO invoices (
  id, user_id, invoice_number, client_name, client_email,
  client_address, client_company, invoice_date, due_date,
  period_start, period_end, subtotal, tax_rate, tax_amount,
  discount_amount, total, currency, status, notes, payment_terms,
  share_token, created_at, updated_at
) VALUES (
  'mock-invoice-id-sample',
  'mock-user-demo-sample',
  'DEMO-2025-001',
  'John Demo',
  'john@democlient.example',
  '789 Client Avenue
Building 5
Client City, TX 73301',
  'Demo Client Corp.',
  '2025-10-01',
  '2025-11-01',
  '2025-09-01',
  '2025-09-30',
  3000.00,
  10.0,
  300.00,
  0,
  3300.00,
  'USD',
  'draft',
  'SAMPLE INVOICE - This is a demonstration invoice showing how your invoices will look.

You can customize:
- Client information
- Line items and rates
- Tax rates and discounts
- Notes and payment terms',
  'Net 30',
  'demo-sample-preview-token',
  datetime('now'),
  datetime('now')
);

-- Step 4: Insert mock invoice line items
INSERT INTO invoice_items (id, invoice_id, task_id, description, quantity, rate, amount, sort_order)
VALUES
  ('mock-item-1', 'mock-invoice-id-sample', NULL, 'Sample Task: Website Design', 20.0, 50.00, 1000.00, 1),
  ('mock-item-2', 'mock-invoice-id-sample', NULL, 'Sample Task: Frontend Development', 25.0, 50.00, 1250.00, 2),
  ('mock-item-3', 'mock-invoice-id-sample', NULL, 'Sample Task: Backend Integration', 15.0, 50.00, 750.00, 3);

-- Add a note about this being sample data
SELECT 'SAMPLE INVOICE DATA CREATED!' as message;
SELECT '⚠️  This is demonstration data with mock information' as note;
SELECT 'Invoice Number: DEMO-2025-001' as details;
SELECT 'Total: $3,300.00' as amount;
SELECT 'Status: Draft (Sample)' as status;
