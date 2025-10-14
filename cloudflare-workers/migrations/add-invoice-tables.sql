-- ============================================
-- Migration: Add Invoice Tables
-- Date: 2025-10-14
-- ============================================

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_address TEXT,
  client_company TEXT,

  -- Invoice Details
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,

  -- Financial
  subtotal REAL NOT NULL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',

  -- Status & Notes
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  notes TEXT,
  payment_terms TEXT DEFAULT 'Net 30',

  -- Email tracking
  sent_at TEXT,
  sent_to TEXT,
  share_token TEXT UNIQUE,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_share_token ON invoices(share_token);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- Invoice Line Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  task_id TEXT,

  description TEXT NOT NULL,
  quantity REAL DEFAULT 1,
  rate REAL NOT NULL,
  amount REAL NOT NULL,
  sort_order INTEGER DEFAULT 0,

  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_task_id ON invoice_items(task_id);

-- Invoice Settings Table
CREATE TABLE IF NOT EXISTS invoice_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,

  -- Business info
  business_name TEXT,
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  tax_id TEXT,
  logo_url TEXT,
  website TEXT,

  -- Default invoice settings
  default_hourly_rate REAL DEFAULT 50.00,
  default_currency TEXT DEFAULT 'USD',
  default_tax_rate REAL DEFAULT 0,
  default_payment_terms TEXT DEFAULT 'Net 30',
  invoice_prefix TEXT DEFAULT 'INV',
  next_invoice_number INTEGER DEFAULT 1,

  -- Bank/Payment info
  payment_instructions TEXT,
  bank_details TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_invoice_settings_user_id ON invoice_settings(user_id);

-- Clients Table (for storing client info)
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_company TEXT,

  notes TEXT,
  is_active INTEGER DEFAULT 1,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_active ON clients(is_active);

-- ============================================
-- Sample Data (Optional - for demonstration)
-- Note: Replace 'YOUR_USER_ID' with an actual user_id from your users table
-- ============================================

-- Sample invoice settings (uncomment and update user_id to use)
/*
INSERT INTO invoice_settings (
  id, user_id, business_name, business_address, business_phone, business_email,
  tax_id, website, default_hourly_rate, default_currency, default_tax_rate,
  default_payment_terms, invoice_prefix, next_invoice_number,
  payment_instructions, bank_details
) VALUES (
  lower(hex(randomblob(16))),
  'YOUR_USER_ID',
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
*/

-- Sample client (uncomment and update user_id to use)
/*
INSERT INTO clients (
  id, user_id, client_name, client_email, client_phone,
  client_address, client_company, notes, is_active
) VALUES (
  lower(hex(randomblob(16))),
  'YOUR_USER_ID',
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
*/

-- Sample invoice (uncomment and update user_id to use)
/*
INSERT INTO invoices (
  id, user_id, invoice_number, client_name, client_email,
  client_address, client_company, invoice_date, due_date,
  period_start, period_end, subtotal, tax_rate, tax_amount,
  discount_amount, total, currency, status, notes, payment_terms,
  share_token, created_at, updated_at
) VALUES (
  lower(hex(randomblob(16))),
  'YOUR_USER_ID',
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
  'sample-demo-token-' || lower(hex(randomblob(8))),
  datetime('now'),
  datetime('now')
);
*/

-- Sample invoice items (uncomment and use the invoice_id from above)
/*
INSERT INTO invoice_items (id, invoice_id, task_id, description, quantity, rate, amount, sort_order)
VALUES
  (lower(hex(randomblob(16))), 'YOUR_INVOICE_ID', NULL, 'Website Frontend Development - React Components', 15.0, 75.00, 1125.00, 1),
  (lower(hex(randomblob(16))), 'YOUR_INVOICE_ID', NULL, 'API Integration - RESTful Endpoints', 10.0, 75.00, 750.00, 2),
  (lower(hex(randomblob(16))), 'YOUR_INVOICE_ID', NULL, 'Bug Fixes and Code Review', 5.0, 75.00, 375.00, 3);
*/
