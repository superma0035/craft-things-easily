-- Fix the handle_new_user function to prevent 500 errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Use INSERT with ON CONFLICT to prevent duplicate key errors
  INSERT INTO public.profiles (id, email, full_name, username, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    username = COALESCE(EXCLUDED.username, profiles.username),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger to prevent blocking auth
    RAISE WARNING 'Failed to create/update profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Create device_sessions table for better session management
CREATE TABLE IF NOT EXISTS public.device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  device_ip text NOT NULL,
  session_token text NOT NULL UNIQUE,
  is_main_device boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '2 hours'),
  last_activity timestamp with time zone NOT NULL DEFAULT now(),
  order_data jsonb DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for device sessions
CREATE POLICY "Anyone can manage device sessions for table access"
ON public.device_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_device_sessions_restaurant_table 
ON public.device_sessions (restaurant_id, table_number);

CREATE INDEX IF NOT EXISTS idx_device_sessions_expires_at 
ON public.device_sessions (expires_at);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM public.device_sessions 
  WHERE expires_at < now();
END;
$function$;

-- Function to transfer main device status with confirmation
CREATE OR REPLACE FUNCTION public.transfer_main_device(
  old_session_token text,
  new_session_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  old_session_data jsonb;
BEGIN
  -- Get the old session data
  SELECT order_data INTO old_session_data
  FROM public.device_sessions
  WHERE session_token = old_session_token AND is_main_device = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Transfer main device status and data
  UPDATE public.device_sessions 
  SET is_main_device = false
  WHERE session_token = old_session_token;
  
  UPDATE public.device_sessions 
  SET 
    is_main_device = true,
    order_data = old_session_data,
    last_activity = now()
  WHERE session_token = new_session_token;
  
  RETURN true;
END;
$function$;