-- ============================================================================
-- Migration: Add Encrypted Trainerize Credential Columns
-- ============================================================================
-- This migration adds encrypted credential columns to the profiles table.
-- The existing plaintext columns are kept temporarily for migration purposes.
-- After running the credential migration script, the plaintext columns should be removed.

-- Add encrypted credential columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trainerize_username_encrypted TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trainerize_password_encrypted TEXT;

-- Add index for quick lookup of users with credentials
CREATE INDEX IF NOT EXISTS idx_profiles_has_trainerize_credentials
  ON public.profiles ((trainerize_username_encrypted IS NOT NULL));

-- IMPORTANT: After migrating existing credentials using the migration script,
-- run the following to remove plaintext columns:
--
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS trainerize_username;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS trainerize_password;
--
-- DO NOT run this until all credentials have been migrated and verified!
