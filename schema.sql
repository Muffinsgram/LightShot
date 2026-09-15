-- Lightshot Clone Database Schema

-- 1. Create a table for user profiles (tiers)
CREATE TABLE public.profiles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'unlimited')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, tier)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Create a table for screenshots
CREATE TABLE public.screenshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means anonymous
    storage_path TEXT NOT NULL,
    public_token TEXT UNIQUE NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    password_hash TEXT, -- NULL means no password
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE -- NULL means it never expires (unlimited tier)
);

-- 3. Set up RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Screenshots policies
CREATE POLICY "Users can view their own screenshots"
ON public.screenshots FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own screenshots"
ON public.screenshots FOR DELETE
USING (auth.uid() = user_id);

-- Allow service role to do everything
CREATE POLICY "Service role has full access to screenshots"
ON public.screenshots FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to profiles"
ON public.profiles FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Create a table for rate limiting (Optional, for Phase 9)
CREATE TABLE public.rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note for Supabase Storage:
-- 1. Create a bucket named "screenshots".
-- 2. Set the bucket to "Private" (we will serve images through API or signed URLs if needed, or if we want it public but unguessable, we can make it public but disable directory listing. Let's make it PRIVATE and our API will serve the image, or we generate short-lived signed URLs. Wait, signed URL is easier for our Next.js API. Or we can just make the bucket PUBLIC but the file names are UUIDs, so they can't be guessed. Let's make the bucket PUBLIC but rely on the unguessable URL).
-- Actually, the prompt says: "Storage bucket'ı gereksiz yere public yapma. Mümkünse screenshot erişimini kontrollü şekilde sağla."
-- So we will make it PRIVATE.
-- No need for public RLS policies on storage. The service role key will handle uploading and retrieving/downloading.
