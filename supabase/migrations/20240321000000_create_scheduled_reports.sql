-- Create enum type for schedule_type
CREATE TYPE schedule_type AS ENUM ('daily', 'weekly', 'monthly');

-- Create scheduled_reports table
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schedule_type schedule_type NOT NULL,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
    time_of_day TIME NOT NULL,
    report_parameters JSONB NOT NULL CHECK (
        report_parameters ? 'start_date_offset' AND 
        report_parameters ? 'end_date_offset' AND 
        report_parameters ? 'min_reps' AND 
        report_parameters ? 'max_reps' AND
        (report_parameters->>'start_date_offset')::int >= 0 AND
        (report_parameters->>'end_date_offset')::int >= 0 AND
        (report_parameters->>'min_reps')::int > 0 AND
        (report_parameters->>'max_reps')::int > 0
    ),
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Additional constraints
    CONSTRAINT valid_weekly_schedule CHECK (
        schedule_type != 'weekly' OR 
        (day_of_week IS NOT NULL AND day_of_month IS NULL)
    ),
    CONSTRAINT valid_monthly_schedule CHECK (
        schedule_type != 'monthly' OR 
        (day_of_month IS NOT NULL AND day_of_week IS NULL)
    ),
    CONSTRAINT valid_daily_schedule CHECK (
        schedule_type != 'daily' OR 
        (day_of_week IS NULL AND day_of_month IS NULL)
    )
);

-- Create index for efficient querying of upcoming reports
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) 
WHERE is_active = true;

-- Create index for querying by trainer
CREATE INDEX idx_scheduled_reports_trainer ON scheduled_reports(trainer_id);

-- Create index for querying by client
CREATE INDEX idx_scheduled_reports_client ON scheduled_reports(client_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_scheduled_reports_updated_at
    BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Policy for trainers to see only their own scheduled reports
CREATE POLICY "Trainers can view their own scheduled reports"
    ON scheduled_reports
    FOR SELECT
    TO authenticated
    USING (trainer_id = auth.uid());

-- Policy for trainers to insert their own scheduled reports
CREATE POLICY "Trainers can create scheduled reports"
    ON scheduled_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (trainer_id = auth.uid());

-- Policy for trainers to update their own scheduled reports
CREATE POLICY "Trainers can update their own scheduled reports"
    ON scheduled_reports
    FOR UPDATE
    TO authenticated
    USING (trainer_id = auth.uid())
    WITH CHECK (trainer_id = auth.uid());

-- Policy for trainers to delete their own scheduled reports
CREATE POLICY "Trainers can delete their own scheduled reports"
    ON scheduled_reports
    FOR DELETE
    TO authenticated
    USING (trainer_id = auth.uid()); 