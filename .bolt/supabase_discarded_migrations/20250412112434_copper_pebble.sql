/*
  # Remove username column from lms_users table
  
  1. Changes
    - Remove username column from lms_users table
    - Remove username-related indexes
    - Update existing data to use email as identifier
  
  2. Security
    - Maintain existing RLS policies
    - No changes to security model required
*/

-- Remove username column and related constraints
ALTER TABLE public.lms_users
DROP COLUMN IF EXISTS username CASCADE;

-- Remove username index if it exists
DROP INDEX IF EXISTS lms_users_username_idx;
DROP INDEX IF EXISTS lms_users_username_key;
