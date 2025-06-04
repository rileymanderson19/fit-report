-- Manual fix to grant trial access
-- Run this in your Supabase SQL Editor

-- Update the user profile to grant access
UPDATE profiles 
SET 
  has_access = true,
  subscription_status = 'trialing',
  updated_at = now()
WHERE email = 'riley@bellyfatprogram.com';

-- Verify the update
SELECT 
  id,
  email,
  has_access,
  customer_id,
  price_id,
  subscription_status
FROM profiles 
WHERE email = 'riley@bellyfatprogram.com'; 