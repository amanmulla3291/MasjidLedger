-- ============================================================
-- SUPABASE STORAGE BUCKETS SETUP
-- Run this in Supabase SQL editor after creating buckets
-- ============================================================

-- Create storage buckets (run via Supabase dashboard or API)
-- Bucket: expense-images (public: false)
-- Bucket: expense-bills  (public: false)
-- Bucket: ramzan-bills   (public: false)
-- Bucket: ramzan-images  (public: false)

-- Storage RLS Policies
-- Allow whitelisted users to upload/read/delete from all buckets

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('expense-images', 'expense-images', false),
  ('expense-bills', 'expense-bills', false),
  ('ramzan-bills', 'ramzan-bills', false),
  ('ramzan-images', 'ramzan-images', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for expense-images
CREATE POLICY "Whitelisted users can upload expense images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'expense-images'
    AND auth.jwt() ->> 'email' IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
  );

CREATE POLICY "Whitelisted users can read expense images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'expense-images'
    AND auth.jwt() ->> 'email' IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
  );

CREATE POLICY "Whitelisted users can delete expense images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'expense-images'
    AND auth.jwt() ->> 'email' IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
  );

-- Policies for expense-bills
CREATE POLICY "Whitelisted users can upload expense bills"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'expense-bills'
    AND auth.jwt() ->> 'email' IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
  );

CREATE POLICY "Whitelisted users can read expense bills"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'expense-bills'
    AND auth.jwt() ->> 'email' IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
  );

CREATE POLICY "Whitelisted users can delete expense bills"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'expense-bills'
    AND auth.jwt() ->> 'email' IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
  );

-- Policies for ramzan-bills
CREATE POLICY "Whitelisted users can upload ramzan bills"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ramzan-bills'
    AND auth.jwt() ->> 'email' IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
  );

CREATE POLICY "Whitelisted users can read ramzan bills"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ramzan-bills'
    AND auth.jwt() ->> 'email' IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
  );

CREATE POLICY "Whitelisted users can delete ramzan bills"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ramzan-bills'
    AND auth.jwt() ->> 'email' IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
  );

-- Policies for ramzan-images
CREATE POLICY "Whitelisted users can upload ramzan images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ramzan-images'
    AND auth.jwt() ->> 'email' IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
  );

CREATE POLICY "Whitelisted users can read ramzan images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ramzan-images'
    AND auth.jwt() ->> 'email' IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
  );

CREATE POLICY "Whitelisted users can delete ramzan images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ramzan-images'
    AND auth.jwt() ->> 'email' IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
  );
