-- ============================================
-- Migration: Add Onboarding Invites Tracking
-- Description: Add field to track if user has sent onboarding invitations
-- Date: 2025-10-22
-- ============================================

-- Add onboarding_invites_sent column to settings table
ALTER TABLE settings ADD COLUMN onboarding_invites_sent INTEGER DEFAULT 0;

-- No index needed as this is just a flag for onboarding flow
