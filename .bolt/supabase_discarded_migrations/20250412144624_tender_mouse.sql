/*
  # Revert Schema Changes

  1. Changes
    - Drop campaign-related tables
    - Remove department enum
    - Restore lms_accounts table
    - Revert lms_users table structure

  2. Security
    - Maintain RLS policies
*/

-- Drop campaigns and progress tables
DROP TABLE IF EXISTS public.user_campaign_progress;
DROP TABLE IF EXISTS public.campaigns;

-- Temporarily alter lms_users to drop department
ALTER TABLE public.lms_users 
  DROP COLUMN IF EXISTS department;

-- Drop department enum
DROP TYPE IF EXISTS department;

-- Recreate lms_accounts if it doesn't exist
CREATE TABLE IF NOT EXISTS public.lms_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Add account_id back to lms_users
ALTER TABLE public.lms_users 
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES lms_accounts(id);

-- Enable RLS
ALTER TABLE public.lms_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can read accounts" ON public.lms_accounts;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create policies
CREATE POLICY "Anyone can read accounts"
  ON public.lms_accounts
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial departments
INSERT INTO public.lms_accounts (name) VALUES
  ('Learning and Development'),
  ('Culture Team'),
  ('Right2Drive')
ON CONFLICT (name) DO NOTHING;

-- Update trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.lms_users (
    id,
    email,
    first_name,
    last_name,
    account_id,
    role
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE((new.raw_user_meta_data->>'account_id')::uuid, NULL),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'learner'::user_role)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
