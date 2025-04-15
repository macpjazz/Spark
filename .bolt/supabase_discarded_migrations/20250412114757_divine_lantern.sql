/*
  # Add missing columns to lms_users table

  1. Changes
    - Add missing columns to lms_users table:
      - department (text, nullable)
      - is_admin (boolean, default false)
    - Add first_name and last_name to lms_profiles instead of lms_users
      (since they're already defined in the profiles table)

  2. Security
    - Maintain existing RLS policies
*/

-- Add department column
ALTER TABLE lms_users 
ADD COLUMN IF NOT EXISTS department text;

-- Add is_admin column with default value
ALTER TABLE lms_users 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
