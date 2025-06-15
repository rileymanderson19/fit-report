-- Add columns to reports table for link tracking
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS generated_link_url TEXT,
ADD COLUMN IF NOT EXISTS link_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups of unexpired links
CREATE INDEX IF NOT EXISTS reports_link_expires_at_idx ON public.reports(link_expires_at) 
WHERE link_expires_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.reports.generated_link_url IS 'Public URL for shareable report link';
COMMENT ON COLUMN public.reports.link_expires_at IS 'Expiration timestamp for the generated link (7 days from creation)'; 