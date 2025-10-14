-- ============================================
-- Insert Sample Invoice Data
-- INSTRUCTIONS: Replace 'YOUR_USER_ID' with your actual user_id
-- Run this after the main migration to add sample data
-- ============================================

-- Step 1: Insert sample invoice settings
INSERT INTO invoice_settings (
  id, user_id, business_name, business_address, business_phone, business_email,
  tax_id, website, default_hourly_rate, default_currency, default_tax_rate,
  default_payment_terms, invoice_prefix, next_invoice_number,
  payment_instructions, bank_details
) VALUES (
  lower(hex(randomblob(16))),
  'YOUR_USER_ID',  -- REPLACE THIS
  'Acme Freelancing',
  '123 Business Street
Suite 100
San Francisco, CA 94105',
  '+1 (555) 123-4567',
  'billing@acmefreelancing.com',
  '12-3456789',
  'https://acmefreelancing.com',
  75.00,
  'USD',
  8.5,
  'Net 30',
  'INV',
  2,
  'Payment can be made via:
- Bank transfer (preferred)
- PayPal: payments@acmefreelancing.com
- Check (mail to address above)

Please include invoice number in payment reference.',
  'Bank: Chase Bank
Account Name: Acme Freelancing LLC
Account Number: 1234567890
Routing Number: 021000021
SWIFT: CHASUS33'
);

-- Step 2: Insert sample client
INSERT INTO clients (
  id, user_id, client_name, client_email, client_phone,
  client_address, client_company, notes, is_active
) VALUES (
  lower(hex(randomblob(16))),
  'YOUR_USER_ID',  -- REPLACE THIS
  'Sarah Johnson',
  'sarah.johnson@techstartup.io',
  '+1 (555) 987-6543',
  '456 Startup Avenue
Floor 3
Austin, TX 78701',
  'TechStartup Inc.',
  'Preferred client - Net 15 payment terms agreed',
  1
);

-- Step 3: Insert sample invoice
-- Note: Save the generated invoice_id for step 4
INSERT INTO invoices (
  id, user_id, invoice_number, client_name, client_email,
  client_address, client_company, invoice_date, due_date,
  period_start, period_end, subtotal, tax_rate, tax_amount,
  discount_amount, total, currency, status, notes, payment_terms,
  share_token, created_at, updated_at
) VALUES (
  lower(hex(randomblob(16))),
  'YOUR_USER_ID',  -- REPLACE THIS
  'INV-2025-001',
  'Sarah Johnson',
  'sarah.johnson@techstartup.io',
  '456 Startup Avenue
Floor 3
Austin, TX 78701',
  'TechStartup Inc.',
  '2025-10-01',
  '2025-10-31',
  '2025-09-01',
  '2025-09-30',
  2250.00,
  8.5,
  191.25,
  0,
  2441.25,
  'USD',
  'sent',
  'Thank you for your continued business! This invoice covers all development work completed in September 2025.

Next milestone: Q4 feature releases scheduled for November.',
  'Net 30',
  'sample-demo-' || lower(hex(randomblob(8))),
  datetime('now'),
  datetime('now')
);

-- Step 4: Insert sample invoice items
-- Note: Get the invoice_id from the previous INSERT and use it here
-- You can find it with: SELECT id FROM invoices WHERE user_id = 'YOUR_USER_ID' AND invoice_number = 'INV-2025-001';

-- Replace 'YOUR_INVOICE_ID' with the actual invoice_id from step 3
INSERT INTO invoice_items (id, invoice_id, task_id, description, quantity, rate, amount, sort_order)
VALUES
  (lower(hex(randomblob(16))), (SELECT id FROM invoices WHERE invoice_number = 'INV-2025-001' AND user_id = 'YOUR_USER_ID'), NULL, 'Website Frontend Development - React Components', 15.0, 75.00, 1125.00, 1),
  (lower(hex(randomblob(16))), (SELECT id FROM invoices WHERE invoice_number = 'INV-2025-001' AND user_id = 'YOUR_USER_ID'), NULL, 'API Integration - RESTful Endpoints', 10.0, 75.00, 750.00, 2),
  (lower(hex(randomblob(16))), (SELECT id FROM invoices WHERE invoice_number = 'INV-2025-001' AND user_id = 'YOUR_USER_ID'), NULL, 'Bug Fixes and Code Review', 5.0, 75.00, 375.00, 3);

-- Verification queries
SELECT 'Invoice Settings Created' as status, COUNT(*) as count FROM invoice_settings WHERE user_id = 'YOUR_USER_ID';
SELECT 'Clients Created' as status, COUNT(*) as count FROM clients WHERE user_id = 'YOUR_USER_ID';
SELECT 'Invoices Created' as status, COUNT(*) as count FROM invoices WHERE user_id = 'YOUR_USER_ID';
SELECT 'Invoice Items Created' as status, COUNT(*) as count FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE user_id = 'YOUR_USER_ID');
