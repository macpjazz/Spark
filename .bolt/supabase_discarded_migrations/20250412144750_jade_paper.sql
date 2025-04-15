/*
  # Create LMS Accounts table

  1. New Tables
    - `lms_accounts`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `lms_accounts` table
    - Add policy for authenticated users to read accounts
*/

CREATE TABLE IF NOT EXISTS public.lms_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lms_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read accounts
CREATE POLICY "Allow authenticated users to read accounts"
  ON public.lms_accounts
  FOR SELECT
  TO authenticated
  USING (true);

-- Add some initial test accounts
INSERT INTO public.lms_accounts (name) VALUES
  ('Test Account 1'),
  ('Test Account 2'),
  ('Test Account 3')
ON CONFLICT DO NOTHING;
