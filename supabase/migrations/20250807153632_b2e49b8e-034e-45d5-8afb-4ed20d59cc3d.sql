-- Fix remaining security warning by updating the other functions

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Fix update_user_has_restaurant function
CREATE OR REPLACE FUNCTION public.update_user_has_restaurant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles 
  SET has_restaurant = true 
  WHERE id = NEW.owner_id;
  RETURN NEW;
END;
$function$;

-- Fix transfer_main_device function
CREATE OR REPLACE FUNCTION public.transfer_main_device(old_session_token text, new_session_token text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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