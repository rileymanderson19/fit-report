-- Add excluded_workout_names column to report_configurations table
ALTER TABLE report_configurations 
ADD COLUMN excluded_workout_names JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN report_configurations.excluded_workout_names IS 'Array of workout names to exclude from reports (case-insensitive matching)'; 