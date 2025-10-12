-- Fix existing users who don't have default_email set
-- This sets their default_email to match their user email

UPDATE settings 
SET default_email = (
  SELECT email FROM users WHERE users.id = settings.user_id
)
WHERE default_email IS NULL OR default_email = '';

