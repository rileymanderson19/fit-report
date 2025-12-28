-- Add notes column to clients table for client-specific context
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.notes IS 'Client-specific notes/context that appears in report headers';

