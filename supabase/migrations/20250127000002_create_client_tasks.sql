-- Create client_tasks table for storing AI-generated action items per client
CREATE TABLE IF NOT EXISTS public.client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  rationale TEXT,
  category TEXT CHECK (category IN ('training', 'nutrition', 'recovery', 'mindset', 'lifestyle', 'general')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Status and tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Source tracking
  generated_from_cache_id UUID REFERENCES public.report_cache(id) ON DELETE SET NULL,
  generated_by_llm BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_client_tasks_trainer_id ON public.client_tasks(trainer_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_client_id ON public.client_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_status ON public.client_tasks(status);
CREATE INDEX IF NOT EXISTS idx_client_tasks_created_at ON public.client_tasks(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Trainers can only access tasks for their own clients
CREATE POLICY "Trainers can view tasks for their clients"
  ON public.client_tasks
  FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert tasks for their clients"
  ON public.client_tasks
  FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update tasks for their clients"
  ON public.client_tasks
  FOR UPDATE
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete tasks for their clients"
  ON public.client_tasks
  FOR DELETE
  USING (auth.uid() = trainer_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_client_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_client_tasks_updated_at_trigger
  BEFORE UPDATE ON public.client_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_tasks_updated_at();

-- Create function to automatically set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION public.set_client_tasks_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set completed_at
CREATE TRIGGER set_client_tasks_completed_at_trigger
  BEFORE UPDATE ON public.client_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_client_tasks_completed_at();

-- Add comment to table
COMMENT ON TABLE public.client_tasks IS 'Stores AI-generated action items and to-dos for clients based on report analysis';
