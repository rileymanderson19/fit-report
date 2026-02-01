-- ============================================================================
-- Migration: Add Invite System for Concierge Onboarding
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Add columns to profiles table for admin and onboarding tracking
-- ----------------------------------------------------------------------------

-- Admin flag for users who can manage invites
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Onboarding status tracking
-- Values: 'pending', 'invited', 'credentials_setup', 'clients_imported', 'completed'
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending';

-- Track when user was invited and by whom
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);

-- Timestamp when onboarding was completed
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Add constraint for onboarding_status values
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_onboarding_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_onboarding_status_check
  CHECK (onboarding_status IN ('pending', 'invited', 'credentials_setup', 'clients_imported', 'completed'));

-- ----------------------------------------------------------------------------
-- Create invites table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email to invite
  email TEXT NOT NULL,

  -- Secure random token for the invite link
  token TEXT NOT NULL UNIQUE,

  -- Admin who created the invite
  invited_by UUID NOT NULL REFERENCES auth.users(id),

  -- Status: 'pending', 'accepted', 'expired', 'revoked'
  status TEXT NOT NULL DEFAULT 'pending',

  -- When the invite expires (default: 48 hours from creation)
  expires_at TIMESTAMPTZ NOT NULL,

  -- When/who accepted the invite
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),

  -- Optional metadata (coach name, notes, etc.)
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT invites_status_check CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON public.invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_invited_by ON public.invites(invited_by);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_invites_updated_at ON public.invites;
CREATE TRIGGER update_invites_updated_at
  BEFORE UPDATE ON public.invites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Create audit_logs table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who performed the action (null for system actions)
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,

  -- What action was performed
  action TEXT NOT NULL,

  -- What type of resource was affected
  resource_type TEXT NOT NULL,

  -- ID of the affected resource (if applicable)
  resource_id TEXT,

  -- Additional details as JSON
  details JSONB DEFAULT '{}',

  -- Request metadata
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS) for invites table
-- ----------------------------------------------------------------------------

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Admins can view all invites
DROP POLICY IF EXISTS "Admins can view all invites" ON public.invites;
CREATE POLICY "Admins can view all invites"
  ON public.invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can create invites
DROP POLICY IF EXISTS "Admins can create invites" ON public.invites;
CREATE POLICY "Admins can create invites"
  ON public.invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update invites (revoke, etc.)
DROP POLICY IF EXISTS "Admins can update invites" ON public.invites;
CREATE POLICY "Admins can update invites"
  ON public.invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can delete invites
DROP POLICY IF EXISTS "Admins can delete invites" ON public.invites;
CREATE POLICY "Admins can delete invites"
  ON public.invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS) for audit_logs table
-- ----------------------------------------------------------------------------

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow service role to insert audit logs (for API routes)
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);
