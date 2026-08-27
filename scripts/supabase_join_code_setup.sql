-- ==============================================================================
-- Travora: Robust Trip Join Code & Membership Schema Setup
-- ==============================================================================

-- 1. Ensure trips table has join_code column and unique constraint
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS join_code VARCHAR(10);

-- Ensure index exists on join_code for ultra-fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_join_code ON public.trips(join_code) WHERE join_code IS NOT NULL;

-- 2. Function: Find trip preview by join code (accessible to authenticated travelers)
CREATE OR REPLACE FUNCTION public.get_trip_by_join_code(code_to_find text)
RETURNS TABLE (
  id uuid,
  name text,
  destination text,
  dates text,
  image text,
  owner_name text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    COALESCE(t.name, 'Trip to ' || t.destination) AS name,
    t.destination,
    t.dates,
    t.image,
    COALESCE(p.name, 'Trip Host') AS owner_name
  FROM public.trips t
  LEFT JOIN public.profiles p ON p.id = t.user_id
  WHERE UPPER(t.join_code) = UPPER(TRIM(code_to_find))
  LIMIT 1;
END;
$$;

-- 3. Function: Join trip by join code (atomic join transaction)
CREATE OR REPLACE FUNCTION public.join_trip_by_code(code_to_join text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_trip_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to join a trip.';
  END IF;

  -- Find trip ID
  SELECT id INTO target_trip_id
  FROM public.trips
  WHERE UPPER(join_code) = UPPER(TRIM(code_to_join))
  LIMIT 1;

  IF target_trip_id IS NULL THEN
    RAISE EXCEPTION 'No trip found with this code. Please verify and try again.';
  END IF;

  -- Check if already a member, if not insert
  IF NOT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = target_trip_id AND user_id = current_user_id
  ) THEN
    INSERT INTO public.trip_members (trip_id, user_id, role)
    VALUES (target_trip_id, current_user_id, 'member');
  END IF;

  RETURN target_trip_id;
END;
$$;

-- 4. Function: Regenerate trip join code (Owner/Admin only)
CREATE OR REPLACE FUNCTION public.regenerate_trip_join_code(trip_id_to_update uuid, new_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Verify owner
  IF NOT EXISTS (
    SELECT 1 FROM public.trips 
    WHERE id = trip_id_to_update AND user_id = current_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = trip_id_to_update AND user_id = current_user_id AND role IN ('owner', 'admin', 'Admin')
  ) THEN
    RAISE EXCEPTION 'Only trip owners or admins can regenerate the join code.';
  END IF;

  UPDATE public.trips
  SET join_code = UPPER(TRIM(new_code))
  WHERE id = trip_id_to_update;

  RETURN new_code;
END;
$$;
