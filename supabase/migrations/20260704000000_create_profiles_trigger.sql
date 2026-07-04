-- Migration: Create public profiles table and sync with auth.users using a trigger
-- Description: This migration solves the issue of displaying the user's email/gmail name instead of their UUID.
--              It automatically creates a public.profiles table and a synchronization trigger in Supabase.

-- 1. Create the profiles table in the public schema
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;

-- Create policy to allow anyone to read profiles (to resolve emails from UIDs)
CREATE POLICY "Allow public read access to profiles" ON public.profiles
    FOR SELECT USING (true);

-- 2. Create the trigger function to copy new user email to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, updated_at)
    VALUES (NEW.id, NEW.email, NOW())
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill existing users (for already registered testing accounts)
INSERT INTO public.profiles (id, email, updated_at)
SELECT id, email, NOW() FROM auth.users
ON CONFLICT (id) DO NOTHING;
