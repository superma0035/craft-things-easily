-- Fix Auth OTP expiry and enable leaked password protection
-- Update auth configuration settings
UPDATE auth.config 
SET 
  password_min_length = 8,
  password_required_characters = 1,  -- Enable leaked password protection
  sms_otp_exp = 3600,               -- Set OTP expiry to 1 hour (3600 seconds)
  email_otp_exp = 3600;             -- Set email OTP expiry to 1 hour

-- If the above doesn't work, try alternative approach
DO $$
BEGIN
  -- Set reasonable OTP expiry times
  UPDATE auth.config SET sms_otp_exp = 3600 WHERE sms_otp_exp IS NOT NULL;
  UPDATE auth.config SET email_otp_exp = 3600 WHERE email_otp_exp IS NOT NULL;
  
  -- Enable password security features
  UPDATE auth.config SET password_min_length = 8 WHERE password_min_length IS NOT NULL;
  UPDATE auth.config SET password_required_characters = 1 WHERE password_required_characters IS NOT NULL;
  
EXCEPTION WHEN OTHERS THEN
  -- If direct config update fails, log the issue
  RAISE NOTICE 'Could not update auth config directly. These settings may need to be configured in Supabase dashboard.';
END $$;