-- Add manual status column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';

-- Add check constraint for valid status values
ALTER TABLE clients ADD CONSTRAINT clients_status_check
  CHECK (status IN ('on_track', 'watch', 'needs_attention', 'new'));
