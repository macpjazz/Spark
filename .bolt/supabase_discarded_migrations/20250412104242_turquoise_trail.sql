/*
  # Create LMS Tables
  
  1. Tables
    - lms_users (core user data)
    - lms_profiles (user profile information)
    - lms_scores (user achievement tracking)
    - lms_sessions (session management)
    - lms_rate_limits (security rate limiting)

  2. Security
    - RLS enabled on all tables
    - Policies for authenticated access
    - Indexes for performance
*/

-- Create users table
CREATE TABLE IF NOT EXISTS public.lms_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  failed_login_attempts integer DEFAULT 0,
  last_login_attempt timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.lms_profiles (
  id uuid PRIMARY KEY REFERENCES public.lms_users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scores table
CREATE TABLE IF NOT EXISTS public.lms_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.lms_users(id) ON DELETE CASCADE,
  category text NOT NULL,
  score integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS public.lms_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.lms_users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now()
);

-- Create rate limits table
CREATE TABLE IF NOT EXISTS public.lms_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  action_type text NOT NULL,
  attempt_count integer DEFAULT 1,
  first_attempt timestamptz DEFAULT now(),
  last_attempt timestamptz DEFAULT now(),
  UNIQUE(ip_address, action_type)
);

-- Enable RLS
ALTER TABLE public.lms_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
  -- Users policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own data' AND tablename = 'lms_users') THEN
    CREATE POLICY "Users can read own data"
      ON public.lms_users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own data' AND tablename = 'lms_users') THEN
    CREATE POLICY "Users can update own data"
      ON public.lms_users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;

  -- Profiles policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own profile' AND tablename = 'lms_profiles') THEN
    CREATE POLICY "Users can read own profile"
      ON public.lms_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'lms_profiles') THEN
    CREATE POLICY "Users can update own profile"
      ON public.lms_profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;

  -- Scores policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own scores' AND tablename = 'lms_scores') THEN
    CREATE POLICY "Users can read own scores"
      ON public.lms_scores
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own scores' AND tablename = 'lms_scores') THEN
    CREATE POLICY "Users can insert own scores"
      ON public.lms_scores
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Sessions policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own sessions' AND tablename = 'lms_sessions') THEN
    CREATE POLICY "Users can manage own sessions"
      ON public.lms_sessions
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS lms_users_username_idx ON public.lms_users (username);
CREATE INDEX IF NOT EXISTS lms_users_email_idx ON public.lms_users (email);
CREATE INDEX IF NOT EXISTS lms_scores_user_id_idx ON public.lms_scores (user_id);
CREATE INDEX IF NOT EXISTS lms_sessions_user_id_idx ON public.lms_sessions (user_id);
CREATE INDEX IF NOT EXISTS lms_sessions_token_idx ON public.lms_sessions (token);
CREATE INDEX IF NOT EXISTS lms_rate_limits_ip_action_idx ON public.lms_rate_limits (ip_address, action_type);

-- Create function to update user's last activity
CREATE OR REPLACE FUNCTION public.update_lms_last_activity()
RETURNS trigger AS $$
BEGIN
  NEW.last_activity = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session activity
DROP TRIGGER IF EXISTS update_session_last_activity ON public.lms_sessions;
CREATE TRIGGER update_session_last_activity
  BEFORE UPDATE ON public.lms_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_lms_last_activity();
