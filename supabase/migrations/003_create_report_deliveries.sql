-- Create report_deliveries table for tracking message deliveries
CREATE TABLE IF NOT EXISTS report_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  delivery_method VARCHAR(50) NOT NULL DEFAULT 'trainerize_message',
  image_url TEXT,
  message_content TEXT,
  trainerize_message_id TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_deliveries_trainer_id ON report_deliveries(trainer_id);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_client_id ON report_deliveries(client_id);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_report_id ON report_deliveries(report_id);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_delivered_at ON report_deliveries(delivered_at);

-- Add RLS policies
ALTER TABLE report_deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: Trainers can view their own deliveries
CREATE POLICY "Trainers can view their own deliveries" ON report_deliveries
  FOR SELECT USING (auth.uid() = trainer_id);

-- Policy: Trainers can insert their own deliveries
CREATE POLICY "Trainers can insert their own deliveries" ON report_deliveries
  FOR INSERT WITH CHECK (auth.uid() = trainer_id);

-- Policy: Trainers can update their own deliveries
CREATE POLICY "Trainers can update their own deliveries" ON report_deliveries
  FOR UPDATE USING (auth.uid() = trainer_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_report_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_report_deliveries_updated_at
  BEFORE UPDATE ON report_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_report_deliveries_updated_at(); 