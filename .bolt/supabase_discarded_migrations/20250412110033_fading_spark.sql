/*
  # Add LMS Accounts Table
  
  1. New Tables
    - lms_accounts: Stores department/account information
      - id (uuid, primary key)
      - name (text, department/account name)
      - created_at (timestamp)
  
  2. Changes
    - Add account_id to lms_users table
    - Add foreign key constraint
  
  3. Security
    - Enable RLS
    - Add policies for reading accounts
*/

-- Create lms_accounts table
CREATE TABLE IF NOT EXISTS public.lms_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Add account_id to lms_users
ALTER TABLE public.lms_users
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.lms_accounts(id);

-- Enable RLS
ALTER TABLE public.lms_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read accounts"
  ON public.lms_accounts
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert some initial departments
INSERT INTO public.lms_accounts (name) VALUES
  ('Engineering'),
  ('Marketing'),
  ('Sales'),
  ('Human Resources'),
  ('Finance')
ON CONFLICT (name) DO NOTHING;
