-- FastShot Update - Analytics Feature
-- Run this in your Supabase SQL Editor

-- 1. Add views_count column to the screenshots table
ALTER TABLE screenshots ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- 2. Create a function to securely increment the view count
CREATE OR REPLACE FUNCTION increment_view(screenshot_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE screenshots
  SET views_count = views_count + 1
  WHERE id = screenshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
