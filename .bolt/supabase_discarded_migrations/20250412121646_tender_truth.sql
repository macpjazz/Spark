/*
  # Fix User Management Tables and Relationships
  
  1. Changes
    - Remove username-related columns and constraints
    - Add missing columns to lms_users
    - Fix foreign key relationship with auth.users
    - Add proper indexes
  
  2. Security
    - Maintain RLS policies
    - Ensure proper cascading deletes
*/

-- Drop any existing constraints first
ALTER TABLE public.lms_users
DROP CONSTRAINT IF EXISTS lms_users_id_fkey;

-- Ensure lms_users has all required columns
ALTER TABLE public.lms_users
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_attempt timestamptz,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add proper foreign key constraint
ALTER TABLE public.lms_users
ADD CONSTRAINT lms_users_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS lms_users_email_idx ON public.lms_users (email);
CREATE INDEX IF NOT EXISTS lms_users_account_id_idx ON public.lms_users (account_id);

-- Ensure RLS is enabled
ALTER TABLE public.lms_users ENABLE ROW LEVEL SECURITY;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can read own data" ON public.lms_users;
DROP POLICY IF EXISTS "Users can update own data" ON public.lms_users;

CREATE POLICY "Users can read own data"
ON public.lms_users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
ON public.lms_users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
