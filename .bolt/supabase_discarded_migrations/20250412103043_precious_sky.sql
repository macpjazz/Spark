/*
  # Fix authentication and admin policies

  1. Changes
    - Enable RLS on auth.users table
    - Update policies for profiles table
    - Add policies for auth.users table access
    - Fix column references to use is_superuser

  2. Security
    - Enable RLS on auth.users table
    - Add policies for admin access
    - Add policies for user self-access
*/

-- Enable RLS on users table
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create new profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- Create new policies for profiles
CREATE POLICY "Users can read their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE users.id = auth.uid()
    AND users.is_superuser = true
  )
);

-- Add policies for users table
CREATE POLICY "Users can read their own user data"
ON auth.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
ON auth.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE users.id = auth.uid()
    AND users.is_superuser = true
  )
);

CREATE POLICY "Admins can update users"
ON auth.users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE users.id = auth.uid()
    AND users.is_superuser = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE users.id = auth.uid()
    AND users.is_superuser = true
  )
);
