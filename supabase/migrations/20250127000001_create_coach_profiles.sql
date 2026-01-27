-- Create coach_profiles table for storing trainer coaching preferences
CREATE TABLE IF NOT EXISTS public.coach_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Coaching style and voice
  coaching_voice TEXT,
  coaching_tone TEXT DEFAULT 'professional and motivating',

  -- Default approach and constraints
  preferred_goal TEXT DEFAULT 'fat loss' CHECK (preferred_goal IN ('fat loss', 'maintenance', 'muscle gain')),
  constraints TEXT,
  focus_areas TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Communication preferences
  communication_style TEXT DEFAULT 'direct and actionable',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on trainer_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_coach_profiles_trainer_id ON public.coach_profiles(trainer_id);

-- Enable Row Level Security
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Trainers can only access their own profile
CREATE POLICY "Trainers can view their own coach profile"
  ON public.coach_profiles
  FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert their own coach profile"
  ON public.coach_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update their own coach profile"
  ON public.coach_profiles
  FOR UPDATE
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete their own coach profile"
  ON public.coach_profiles
  FOR DELETE
  USING (auth.uid() = trainer_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_coach_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_coach_profiles_updated_at_trigger
  BEFORE UPDATE ON public.coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_coach_profiles_updated_at();

-- Add comment to table
COMMENT ON TABLE public.coach_profiles IS 'Stores trainer coaching preferences and style for automated action plan generation';
