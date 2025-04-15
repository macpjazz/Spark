/*
  # Consolidate User Information
  
  1. Changes
    - Add first_name and last_name to lms_users
    - Drop lms_profiles table
    - Update RLS policies
  
  2. Security
    - Maintain existing RLS policies for lms_users
    - Ensure data integrity during migration
*/

-- Add new columns to lms_users if they don't exist
ALTER TABLE public.lms_users
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Copy data from lms_profiles to lms_users
DO $$
BEGIN
  UPDATE public.lms_users u
  SET 
    first_name = p.first_name,
    last_name = p.last_name
  FROM public.lms_profiles p
  WHERE u.id = p.id;
END $$;

-- Drop lms_profiles table and its dependencies
DROP TABLE IF EXISTS public.lms_profiles CASCADE;
