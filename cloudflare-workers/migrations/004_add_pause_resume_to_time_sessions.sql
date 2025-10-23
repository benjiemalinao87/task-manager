-- ============================================
-- Migration: Add Pause/Resume Feature to Time Sessions
-- Description: Add fields to track pause/resume functionality for time tracking
-- Date: 2025-10-23
-- ============================================

-- Add pause tracking fields
ALTER TABLE time_sessions ADD COLUMN is_paused INTEGER DEFAULT 0;
ALTER TABLE time_sessions ADD COLUMN paused_at TEXT;
ALTER TABLE time_sessions ADD COLUMN total_paused_minutes INTEGER DEFAULT 0;
ALTER TABLE time_sessions ADD COLUMN pause_count INTEGER DEFAULT 0;
