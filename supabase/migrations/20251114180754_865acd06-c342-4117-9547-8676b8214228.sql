-- Create a secure RPC to fetch a public restaurant by id without relying on RLS view conditions
-- This function returns only safe public fields and requires the restaurant to be active

BEGIN;

CREATE OR REPLACE FUNCTION public.get_public_restaurant(restaurant_uuid uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  logo_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.name, r.description, r.logo_url
  FROM public.restaurants r
  WHERE r.id = restaurant_uuid AND COALESCE(r.is_active, true) = true
$$;

-- Ensure only intended roles can execute
REVOKE ALL ON FUNCTION public.get_public_restaurant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_restaurant(uuid) TO anon, authenticated;

COMMIT;