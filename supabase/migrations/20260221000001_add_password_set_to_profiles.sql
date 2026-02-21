-- Add password_set column to profiles table
-- Used to explicitly track whether a user has set a password.
-- Defaults to false. Set to true when a user successfully sets/changes their password.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT false;

-- Backfill: self-registered users (no invited_by) with completed onboarding likely have a password
UPDATE public.profiles SET password_set = true
WHERE invited_by IS NULL AND onboarding_status = 'completed';
