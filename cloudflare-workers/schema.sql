-- ============================================
-- CLOUDFLARE D1 SCHEMA
-- Task Manager - Multi-tenant SaaS
-- ============================================

-- Users Table (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  plan_name TEXT DEFAULT 'Early Adopter',
  ai_tokens_used INTEGER DEFAULT 0,
  ai_tokens_limit INTEGER DEFAULT 100000,
  ai_tokens_reset_at TEXT DEFAULT (datetime('now', '+30 days')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login TEXT,
  email_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================
-- Tasks Table (UPDATED with user_id)
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_time TEXT NOT NULL,
  actual_time TEXT,
  task_link TEXT,
  ai_summary TEXT,
  status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  asana_task_id TEXT,
  notes TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- ============================================
-- Settings Table (UPDATED - per user)
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  default_email TEXT NOT NULL DEFAULT '',
  timezone TEXT DEFAULT 'America/Los_Angeles',
  notifications_enabled INTEGER DEFAULT 1,
  notify_task_created INTEGER DEFAULT 1,
  notify_task_completed INTEGER DEFAULT 1,
  notify_daily_summary INTEGER DEFAULT 0,
  notify_weekly_summary INTEGER DEFAULT 0,
  onboarding_completed INTEGER DEFAULT 0,
  invoice_module_enabled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_settings_user_id ON settings(user_id);

-- ============================================
-- Time Sessions Table (UPDATED with user_id)
-- ============================================
CREATE TABLE IF NOT EXISTS time_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  clock_in TEXT NOT NULL DEFAULT (datetime('now')),
  clock_out TEXT,
  duration_minutes INTEGER,
  report_sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_time_sessions_user_id ON time_sessions(user_id);
CREATE INDEX idx_time_sessions_clock_in ON time_sessions(clock_in);

-- ============================================
-- Integrations Table (UPDATED - per user)
-- ============================================
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  integration_type TEXT NOT NULL CHECK(integration_type IN ('asana', 'resend', 'sendgrid')),
  api_key TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 0,
  config TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, integration_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_integrations_user_id ON integrations(user_id);
CREATE INDEX idx_integrations_type ON integrations(integration_type);
CREATE INDEX idx_integrations_active ON integrations(is_active);

-- ============================================
-- Invoices Table (NEW)
-- ============================================
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

-- ============================================
-- Invoice Line Items Table (NEW)
-- ============================================
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

-- ============================================
-- Invoice Settings Table (NEW)
-- ============================================
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

-- ============================================
-- Clients Table (NEW - for storing client info)
-- ============================================
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
