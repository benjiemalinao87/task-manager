-- Add custom email subject line columns to settings table
ALTER TABLE settings ADD COLUMN email_subject_task_created TEXT;
ALTER TABLE settings ADD COLUMN email_subject_task_completed TEXT;

