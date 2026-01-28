-- Add goal column to clients table
-- This allows tracking client fitness goals (fat loss, maintenance, muscle gain)

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS goal VARCHAR(20)
CHECK (goal IN ('fat_loss', 'maintenance', 'muscle_gain'));

-- Add comment for documentation
COMMENT ON COLUMN clients.goal IS 'Client fitness goal: fat_loss, maintenance, or muscle_gain';

-- Create index for filtering by goal (optional but recommended for performance)
CREATE INDEX IF NOT EXISTS idx_clients_goal ON clients(goal);
