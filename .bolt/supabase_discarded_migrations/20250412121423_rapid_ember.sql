/*
  # Fix auth system tables and constraints

  1. Changes
    - Remove attempt to recreate auth.* tables (these are managed by Supabase)
    - Only update the lms_users foreign key constraint
    - Ensure proper cascade behavior

  2. Security
    - Maintain referential integrity with auth.users
*/

-- Update lms_users foreign key to properly reference auth.users
ALTER TABLE public.lms_users
DROP CONSTRAINT IF EXISTS lms_users_id_fkey,
ADD CONSTRAINT lms_users_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
