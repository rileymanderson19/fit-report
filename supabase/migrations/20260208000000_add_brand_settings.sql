-- Add brand settings columns to report_configurations table
ALTER TABLE report_configurations
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#8B5CF6',
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#7C3AED',
  ADD COLUMN IF NOT EXISTS footer_text TEXT,
  ADD COLUMN IF NOT EXISTS show_fitreport_badge BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN report_configurations.logo_url IS 'URL to trainer logo in Supabase Storage (brand-logos bucket)';
COMMENT ON COLUMN report_configurations.primary_color IS 'Hex color for primary brand color in reports';
COMMENT ON COLUMN report_configurations.accent_color IS 'Hex color for accent/secondary brand color in reports';
COMMENT ON COLUMN report_configurations.show_fitreport_badge IS 'Whether to show Powered by FitReport in report footer';
