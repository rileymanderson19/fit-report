-- Create report_cache table for live on-demand report generation
CREATE TABLE IF NOT EXISTS public.report_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date_range_start TIMESTAMPTZ NOT NULL,
  date_range_end TIMESTAMPTZ NOT NULL,
  template TEXT NOT NULL DEFAULT 'enhanced',
  rep_range JSONB NOT NULL DEFAULT '{"min": 6, "max": 10}'::jsonb,
  cache_key TEXT NOT NULL UNIQUE,
  report_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'running', 'error')),
  expires_at TIMESTAMPTZ NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on cache_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_report_cache_cache_key ON public.report_cache(cache_key);

-- Create index on trainer_id and client_id for filtering
CREATE INDEX IF NOT EXISTS idx_report_cache_trainer_client ON public.report_cache(trainer_id, client_id);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_report_cache_expires_at ON public.report_cache(expires_at);

-- Enable Row Level Security
ALTER TABLE public.report_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Trainers can only access their own cached reports
CREATE POLICY "Trainers can view their own report cache"
  ON public.report_cache
  FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert their own report cache"
  ON public.report_cache
  FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update their own report cache"
  ON public.report_cache
  FOR UPDATE
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete their own report cache"
  ON public.report_cache
  FOR DELETE
  USING (auth.uid() = trainer_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_report_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_report_cache_updated_at_trigger
  BEFORE UPDATE ON public.report_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_report_cache_updated_at();

-- Add comment to table
COMMENT ON TABLE public.report_cache IS 'Cache table for live on-demand report generation with automatic expiration';
