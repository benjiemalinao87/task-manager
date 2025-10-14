-- Insert sample invoice data for benjiemalinao87@gmail.com
-- User ID: 5f304832-e8c3-4674-956c-374cf8b00518

-- Step 1: Insert invoice settings
INSERT INTO invoice_settings (
  id, user_id, business_name, business_address, business_phone, business_email,
  tax_id, website, default_hourly_rate, default_currency, default_tax_rate,
  default_payment_terms, invoice_prefix, next_invoice_number,
  payment_instructions, bank_details
) VALUES (
  lower(hex(randomblob(16))),
  '5f304832-e8c3-4674-956c-374cf8b00518',
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
  '5f304832-e8c3-4674-956c-374cf8b00518',
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
INSERT INTO invoices (
  id, user_id, invoice_number, client_name, client_email,
  client_address, client_company, invoice_date, due_date,
  period_start, period_end, subtotal, tax_rate, tax_amount,
  discount_amount, total, currency, status, notes, payment_terms,
  share_token, created_at, updated_at
) VALUES (
  lower(hex(randomblob(16))),
  '5f304832-e8c3-4674-956c-374cf8b00518',
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
INSERT INTO invoice_items (id, invoice_id, task_id, description, quantity, rate, amount, sort_order)
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM invoices WHERE invoice_number = 'INV-2025-001' AND user_id = '5f304832-e8c3-4674-956c-374cf8b00518'),
  NULL,
  'Website Frontend Development - React Components',
  15.0,
  75.00,
  1125.00,
  1
UNION ALL
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM invoices WHERE invoice_number = 'INV-2025-001' AND user_id = '5f304832-e8c3-4674-956c-374cf8b00518'),
  NULL,
  'API Integration - RESTful Endpoints',
  10.0,
  75.00,
  750.00,
  2
UNION ALL
SELECT
  lower(hex(randomblob(16))),
  (SELECT id FROM invoices WHERE invoice_number = 'INV-2025-001' AND user_id = '5f304832-e8c3-4674-956c-374cf8b00518'),
  NULL,
  'Bug Fixes and Code Review',
  5.0,
  75.00,
  375.00,
  3;

-- Verification
SELECT 'Sample data inserted successfully!' as message;
SELECT 'Invoice Settings:' as section, business_name, default_hourly_rate FROM invoice_settings WHERE user_id = '5f304832-e8c3-4674-956c-374cf8b00518';
SELECT 'Clients:' as section, client_name, client_company FROM clients WHERE user_id = '5f304832-e8c3-4674-956c-374cf8b00518';
SELECT 'Invoices:' as section, invoice_number, client_name, total, status FROM invoices WHERE user_id = '5f304832-e8c3-4674-956c-374cf8b00518';
SELECT 'Invoice Items:' as section, description, quantity, amount FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE user_id = '5f304832-e8c3-4674-956c-374cf8b00518');
