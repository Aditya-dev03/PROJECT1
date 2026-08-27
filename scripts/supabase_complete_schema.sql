-- ====================================================================
-- Travora Complete Supabase Database Schema & Setup Migration
-- ====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles Table (syncs with Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  photo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, photo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    photo = EXCLUDED.photo,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Trips Table
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  dates TEXT,
  budget TEXT,
  image TEXT,
  join_code VARCHAR(12) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_join_code ON public.trips(join_code);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);

-- 4. Trip Members Table
CREATE TABLE IF NOT EXISTS public.trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON public.trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON public.trip_members(user_id);

-- 5. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  category TEXT DEFAULT 'General',
  paid_by TEXT,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);

-- 6. Itineraries Table
CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  days_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id)
);

-- Ensure backwards-compatibility with existing tables
ALTER TABLE IF EXISTS public.itineraries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS public.itineraries ADD COLUMN IF NOT EXISTS days_json JSONB DEFAULT '[]'::jsonb;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'itineraries_trip_id_key'
  ) THEN
    ALTER TABLE IF EXISTS public.itineraries ADD CONSTRAINT itineraries_trip_id_key UNIQUE (trip_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_itineraries_trip_id ON public.itineraries(trip_id);

-- 7. Messages Table (Group Chat)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  text TEXT,
  image TEXT,
  type VARCHAR(20) DEFAULT 'message',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_trip_id ON public.messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- 8. RPC: Lookup Trip By Join Code (Accessible to authenticated users)

CREATE OR REPLACE FUNCTION public.get_trip_by_join_code(code_to_find TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  destination TEXT,
  dates TEXT,
  image TEXT,
  join_code VARCHAR(12),
  owner_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.destination,
    t.dates,
    t.image,
    t.join_code,
    COALESCE(p.name, 'Trip Host') AS owner_name
  FROM public.trips t
  LEFT JOIN public.profiles p ON p.id = t.user_id
  WHERE UPPER(TRIM(t.join_code)) = UPPER(TRIM(code_to_find))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: Atomic Join Trip By Code
CREATE OR REPLACE FUNCTION public.join_trip_by_code(code_to_join TEXT)
RETURNS UUID AS $$
DECLARE
  target_trip_id UUID;
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to join a trip.';
  END IF;

  SELECT id INTO target_trip_id
  FROM public.trips
  WHERE UPPER(TRIM(join_code)) = UPPER(TRIM(code_to_join))
  LIMIT 1;

  IF target_trip_id IS NULL THEN
    RAISE EXCEPTION 'Trip with code % not found.', code_to_join;
  END IF;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (target_trip_id, calling_user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  RETURN target_trip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: Regenerate Join Code for Trip Host
CREATE OR REPLACE FUNCTION public.regenerate_trip_join_code(target_trip_id UUID, new_code TEXT)
RETURNS TEXT AS $$
DECLARE
  calling_user_id UUID;
  trip_owner_id UUID;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT user_id INTO trip_owner_id
  FROM public.trips
  WHERE id = target_trip_id;

  IF trip_owner_id IS NULL OR trip_owner_id != calling_user_id THEN
    RAISE EXCEPTION 'Only the trip host can regenerate the join code.';
  END IF;

  UPDATE public.trips
  SET join_code = UPPER(TRIM(new_code)), updated_at = NOW()
  WHERE id = target_trip_id;

  RETURN UPPER(TRIM(new_code));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are readable by everyone" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trips Policies
CREATE POLICY "Users can view trips they own or belong to" ON public.trips
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = id AND tm.user_id = auth.uid())
  );
CREATE POLICY "Users can insert their own trips" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Hosts can update their trips" ON public.trips
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Hosts can delete their trips" ON public.trips
  FOR DELETE USING (auth.uid() = user_id);

-- Trip Members Policies
CREATE POLICY "Members can view other members of their trips" ON public.trip_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_members.trip_id AND tm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_members.trip_id AND t.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can join trips" ON public.trip_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Hosts or members can leave/remove" ON public.trip_members
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_members.trip_id AND t.user_id = auth.uid())
  );

-- Expenses Policies
CREATE POLICY "Trip members can view expenses" ON public.expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = expenses.trip_id AND tm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = expenses.trip_id AND t.user_id = auth.uid()
    )
  );
CREATE POLICY "Trip members can insert expenses" ON public.expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = expenses.trip_id AND tm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = expenses.trip_id AND t.user_id = auth.uid()
    )
  );

-- Itineraries Policies
CREATE POLICY "Trip members can view itineraries" ON public.itineraries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = itineraries.trip_id AND tm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = itineraries.trip_id AND t.user_id = auth.uid()
    )
  );
CREATE POLICY "Trip members can update itineraries" ON public.itineraries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = itineraries.trip_id AND tm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = itineraries.trip_id AND t.user_id = auth.uid()
    )
  );

-- Messages Policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = messages.trip_id AND tm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = messages.trip_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = messages.trip_id AND tm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = messages.trip_id AND t.user_id = auth.uid()
    )
  );

