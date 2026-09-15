-- Run this in Supabase SQL Editor to add API keys to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;
UPDATE profiles SET api_key = encode(gen_random_bytes(16), 'hex') WHERE api_key IS NULL;
