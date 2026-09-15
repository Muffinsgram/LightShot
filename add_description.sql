-- Add description column to screenshots
ALTER TABLE screenshots ADD COLUMN IF NOT EXISTS description TEXT;
