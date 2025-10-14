-- ============================================
-- Migration: Add Invoice Module Toggle to Settings
-- Date: 2025-10-14
-- Description: Adds invoice_module_enabled field to settings table
--              Default is 0 (disabled) for minimalistic view
-- ============================================

-- Add invoice_module_enabled column if it doesn't exist
-- SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we use a safe approach

-- For new installations, this is already in the schema.sql
-- For existing databases, run this migration:

ALTER TABLE settings ADD COLUMN invoice_module_enabled INTEGER DEFAULT 0;

-- Verification
SELECT 'Invoice module toggle added successfully' as status;
SELECT COUNT(*) as users_with_setting FROM settings WHERE invoice_module_enabled IS NOT NULL;
