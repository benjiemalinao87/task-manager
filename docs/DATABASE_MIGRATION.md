# Database Migration: PostgreSQL → D1

## Overview

Migrate from Supabase PostgreSQL to Cloudflare D1 (SQLite) with proper user isolation.

---

## Schema Differences

### PostgreSQL vs SQLite

| Feature | PostgreSQL | D1 (SQLite) | Migration Strategy |
|---------|-----------|-------------|-------------------|
| **UUID Type** | `uuid` native | `TEXT` | Use TEXT, generate in Workers |
| **Timestamps** | `timestamptz` | `TEXT` | Store ISO 8601 strings |
| **JSONB** | Native | `TEXT` | JSON.stringify/parse |
| **Boolean** | `boolean` | `INTEGER` (0/1) | Convert bool → int |
| **Auto Increment** | `SERIAL` | `AUTOINCREMENT` | Different syntax |
| **NOW()** | `NOW()` | `datetime('now')` | Function name change |

---

## New D1 Schema

### Complete Schema SQL

```sql
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
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login TEXT,
  email_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================
-- Tasks Table (UPDATED)
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- NEW: Foreign key
  task_name TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_time TEXT NOT NULL,
  actual_time TEXT,
  task_link TEXT,
  ai_summary TEXT,
  status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'cancelled')),
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

-- ============================================
-- Settings Table (UPDATED)
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,  -- NEW: One settings row per user
  default_email TEXT NOT NULL DEFAULT '',
  timezone TEXT DEFAULT 'America/Los_Angeles',
  notifications_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_settings_user_id ON settings(user_id);

-- ============================================
-- Time Sessions Table (UPDATED)
-- ============================================
CREATE TABLE IF NOT EXISTS time_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- NEW: Foreign key
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
-- Integrations Table (UPDATED)
-- ============================================
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- NEW: Foreign key
  integration_type TEXT NOT NULL CHECK(integration_type IN ('asana', 'resend', 'sendgrid')),
  api_key TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 0,
  config TEXT DEFAULT '{}',  -- JSON stored as TEXT
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, integration_type),  -- One integration per type per user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_integrations_user_id ON integrations(user_id);
CREATE INDEX idx_integrations_type ON integrations(integration_type);
CREATE INDEX idx_integrations_active ON integrations(is_active);

-- ============================================
-- Sessions Table (NEW - for auth tokens)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  last_accessed TEXT DEFAULT (datetime('now')),
  user_agent TEXT,
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

---

## Migration Steps

### Step 1: Create D1 Database

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create task-manager-db

# Output will show:
# [[d1_databases]]
# binding = "DB"
# database_name = "task-manager-db"
# database_id = "<YOUR-DATABASE-ID>"
```

### Step 2: Run Schema Migration

```bash
# Create schema.sql file with the SQL above
# Then execute:

wrangler d1 execute task-manager-db --file=./schema.sql

# Verify tables created:
wrangler d1 execute task-manager-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### Step 3: Export Data from Supabase

```bash
# Export all tables
supabase db dump --file=supabase_dump.sql

# Or export specific tables
supabase db dump --table tasks --file=tasks.sql
supabase db dump --table settings --file=settings.sql
supabase db dump --table time_sessions --file=time_sessions.sql
supabase db dump --table integrations --file=integrations.sql
```

### Step 4: Transform Data

Create a transformation script (`transform-data.js`):

```javascript
// transform-data.js
import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

// Read Supabase dump
const supabaseData = JSON.parse(readFileSync('./supabase_data.json', 'utf8'));

// Create a default user for existing data
const defaultUserId = randomUUID();
const defaultUser = {
  id: defaultUserId,
  email: 'migrated@example.com',
  name: 'Migrated User',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Transform tasks
const transformedTasks = supabaseData.tasks.map(task => ({
  id: task.id,
  user_id: defaultUserId, // Assign to default user
  task_name: task.task_name,
  description: task.description,
  estimated_time: task.estimated_time,
  actual_time: task.actual_time || null,
  task_link: task.task_link || null,
  ai_summary: task.ai_summary || null,
  status: task.status || 'in_progress',
  asana_task_id: task.asana_task_id || null,
  notes: task.notes || null,
  started_at: task.started_at,
  completed_at: task.completed_at || null,
  created_at: task.created_at,
  updated_at: task.updated_at
}));

// Transform settings
const transformedSettings = supabaseData.settings.map(setting => ({
  id: randomUUID(),
  user_id: defaultUserId,
  default_email: setting.default_email || '',
  created_at: setting.created_at,
  updated_at: setting.updated_at
}));

// Transform time_sessions
const transformedSessions = supabaseData.time_sessions.map(session => ({
  id: session.id,
  user_id: defaultUserId,
  clock_in: session.clock_in,
  clock_out: session.clock_out || null,
  duration_minutes: session.duration_minutes || null,
  report_sent: session.report_sent ? 1 : 0, // Convert boolean to integer
  created_at: session.created_at,
  updated_at: session.updated_at
}));

// Transform integrations
const transformedIntegrations = supabaseData.integrations.map(integration => ({
  id: integration.id,
  user_id: defaultUserId,
  integration_type: integration.integration_type,
  api_key: integration.api_key || '',
  is_active: integration.is_active ? 1 : 0, // Convert boolean to integer
  config: JSON.stringify(integration.config || {}), // JSONB to TEXT
  created_at: integration.created_at,
  updated_at: integration.updated_at
}));

// Generate SQL INSERT statements
const generateInserts = (table, data) => {
  if (data.length === 0) return '';

  const columns = Object.keys(data[0]);
  const values = data.map(row => {
    const vals = columns.map(col => {
      const val = row[col];
      if (val === null) return 'NULL';
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
      return val;
    });
    return `(${vals.join(', ')})`;
  });

  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${values.join(',\n')};\n\n`;
};

// Generate final SQL
let finalSQL = `-- Migrated Data from Supabase to D1\n-- Generated: ${new Date().toISOString()}\n\n`;

finalSQL += `-- Insert default user\n`;
finalSQL += generateInserts('users', [defaultUser]);

finalSQL += `-- Insert tasks\n`;
finalSQL += generateInserts('tasks', transformedTasks);

finalSQL += `-- Insert settings\n`;
finalSQL += generateInserts('settings', transformedSettings);

finalSQL += `-- Insert time_sessions\n`;
finalSQL += generateInserts('time_sessions', transformedSessions);

finalSQL += `-- Insert integrations\n`;
finalSQL += generateInserts('integrations', transformedIntegrations);

// Write to file
writeFileSync('./d1_migration.sql', finalSQL);

console.log('✅ Data transformation complete!');
console.log(`📝 Generated SQL file: d1_migration.sql`);
console.log(`👤 Default user created with ID: ${defaultUserId}`);
console.log(`   Email: migrated@example.com`);
console.log(`\n⚠️  IMPORTANT: You must set a password for this user after migration!`);
```

### Step 5: Import to D1

```bash
# Run transformation script
node transform-data.js

# Import transformed data
wrangler d1 execute task-manager-db --file=./d1_migration.sql

# Verify data
wrangler d1 execute task-manager-db --command="SELECT COUNT(*) as count FROM tasks;"
wrangler d1 execute task-manager-db --command="SELECT COUNT(*) as count FROM users;"
```

---

## Data Validation

### Validation Queries

```sql
-- Check all tables have data
SELECT
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'settings', COUNT(*) FROM settings
UNION ALL
SELECT 'time_sessions', COUNT(*) FROM time_sessions
UNION ALL
SELECT 'integrations', COUNT(*) FROM integrations;

-- Verify foreign key relationships
SELECT
  t.id,
  t.user_id,
  u.email
FROM tasks t
LEFT JOIN users u ON t.user_id = u.id
WHERE u.id IS NULL;  -- Should return 0 rows

-- Check data integrity
SELECT * FROM tasks WHERE user_id IS NULL;  -- Should return 0 rows
SELECT * FROM tasks WHERE task_name = '';   -- Should return 0 rows
SELECT * FROM tasks WHERE description = ''; -- Should return 0 rows
```

---

## Rollback Procedure

If migration fails:

```bash
# Drop all tables
wrangler d1 execute task-manager-db --command="DROP TABLE IF EXISTS sessions;"
wrangler d1 execute task-manager-db --command="DROP TABLE IF EXISTS integrations;"
wrangler d1 execute task-manager-db --command="DROP TABLE IF EXISTS time_sessions;"
wrangler d1 execute task-manager-db --command="DROP TABLE IF EXISTS settings;"
wrangler d1 execute task-manager-db --command="DROP TABLE IF EXISTS tasks;"
wrangler d1 execute task-manager-db --command="DROP TABLE IF EXISTS users;"

# Re-run schema creation
wrangler d1 execute task-manager-db --file=./schema.sql

# Try migration again
wrangler d1 execute task-manager-db --file=./d1_migration.sql
```

---

## Post-Migration Tasks

- [ ] Verify all data migrated correctly
- [ ] Create test user accounts
- [ ] Set password for migrated user
- [ ] Test queries with user_id filtering
- [ ] Backup D1 database
- [ ] Update Wrangler config with database binding

---

## Common Issues & Solutions

### Issue: UUID format errors

**Solution:** D1 uses TEXT for UUIDs. Ensure all UUIDs are valid strings.

```javascript
// Generate UUIDs in Workers
import { randomUUID } from 'crypto';
const id = randomUUID(); // Returns: "a1b2c3d4-..."
```

### Issue: Timestamp format errors

**Solution:** Store timestamps as ISO 8601 strings.

```javascript
// Current time
const now = new Date().toISOString(); // "2025-01-15T10:30:00.000Z"

// Query with date comparison
await env.DB.prepare(`
  SELECT * FROM tasks
  WHERE created_at >= datetime('now', '-7 days')
`).all();
```

### Issue: Boolean conversion

**Solution:** SQLite uses INTEGER (0/1) for booleans.

```javascript
// Store boolean
const isActive = true;
await env.DB.prepare('INSERT INTO users (is_active) VALUES (?)').bind(isActive ? 1 : 0).run();

// Read boolean
const row = await env.DB.prepare('SELECT is_active FROM users').first();
const isActive = row.is_active === 1; // Convert back to boolean
```

---

## Next Steps

After database migration is complete:

1. ✅ Proceed to [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md)
2. ✅ Set up Workers to query D1
3. ✅ Implement user_id filtering in all queries

---

**Last Updated:** 2025-10-12
