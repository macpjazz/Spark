/*
  # Add Departments Table
  
  1. New Tables
    - departments
      - id (uuid, primary key)
      - name (text, department name)
      - created_at (timestamp)
      - updated_at (timestamp)
  
  2. Security
    - Enable RLS
    - Add policies for reading departments
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read departments"
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial departments
INSERT INTO public.departments (name) VALUES
  ('Learning and Development'),
  ('Culture Team'),
  ('Movigo')
ON CONFLICT (name) DO NOTHING;

-- Add department_id to lms_users if it doesn't exist
ALTER TABLE public.lms_users
DROP COLUMN IF EXISTS department,
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_lms_users_department_id ON public.lms_users(department_id);
