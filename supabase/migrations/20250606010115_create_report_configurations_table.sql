-- Create report_configurations table
CREATE TABLE IF NOT EXISTS report_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  default_subject TEXT NOT NULL DEFAULT 'Your Fitness Report - {date}',
  default_message TEXT NOT NULL DEFAULT 'Hi {clientName},

I''ve attached your latest progress report. If you have any questions about the data or want to discuss adjustments to your program, feel free to reach out.

View your report: {reportUrl}',
  signature TEXT DEFAULT 'Best regards,
{trainerName}',
  include_workouts_default BOOLEAN DEFAULT true,
  include_nutrition_default BOOLEAN DEFAULT true,
  include_progress_default BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE report_configurations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own report configurations" 
ON report_configurations
FOR ALL 
USING (trainer_id = auth.uid());

-- Create unique constraint to ensure one config per trainer
CREATE UNIQUE INDEX report_configurations_trainer_id_unique 
ON report_configurations (trainer_id);

-- Add comment for documentation
COMMENT ON TABLE report_configurations IS 'Stores customizable messaging templates and default settings for fitness report deliveries';
