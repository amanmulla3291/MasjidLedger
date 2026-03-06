-- ============================================================
-- MASJID LEDGER - SUPABASE SCHEMA
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COLLECTIONS TABLE (Friday Sadaqah)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DENOMINATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.denominations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  one_rupee INTEGER DEFAULT 0,
  two_rupee INTEGER DEFAULT 0,
  five_rupee INTEGER DEFAULT 0,
  ten_rupee INTEGER DEFAULT 0,
  twenty_rupee INTEGER DEFAULT 0,
  fifty_rupee INTEGER DEFAULT 0,
  hundred_rupee INTEGER DEFAULT 0
);

-- ============================================================
-- EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  before_photo_url TEXT,
  after_photo_url TEXT,
  bill_url TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RAMZAN YEAR TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ramzan_year (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL UNIQUE,
  hafiz_name TEXT NOT NULL,
  expected_salary NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RAMZAN CONTRIBUTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ramzan_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ramzan_year_id UUID NOT NULL REFERENCES public.ramzan_year(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RAMZAN EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ramzan_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ramzan_year_id UUID NOT NULL REFERENCES public.ramzan_year(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  bill_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.denominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ramzan_year ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ramzan_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ramzan_expenses ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is whitelisted
CREATE OR REPLACE FUNCTION public.is_whitelisted_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM public.users
      WHERE email = auth.jwt() ->> 'email'
      AND email IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS policies
CREATE POLICY "Whitelisted users can read users" ON public.users
  FOR SELECT USING (public.is_whitelisted_user());

CREATE POLICY "Whitelisted users can insert own record" ON public.users
  FOR INSERT WITH CHECK (
    email IN ('amanmulla.aws@gmail.com', 'altablumma36@gmail.com')
    AND email = auth.jwt() ->> 'email'
  );

-- COLLECTIONS policies
CREATE POLICY "Whitelisted users can manage collections" ON public.collections
  FOR ALL USING (public.is_whitelisted_user());

-- DENOMINATIONS policies
CREATE POLICY "Whitelisted users can manage denominations" ON public.denominations
  FOR ALL USING (public.is_whitelisted_user());

-- EXPENSES policies
CREATE POLICY "Whitelisted users can manage expenses" ON public.expenses
  FOR ALL USING (public.is_whitelisted_user());

-- RAMZAN YEAR policies
CREATE POLICY "Whitelisted users can manage ramzan_year" ON public.ramzan_year
  FOR ALL USING (public.is_whitelisted_user());

-- RAMZAN CONTRIBUTIONS policies
CREATE POLICY "Whitelisted users can manage ramzan_contributions" ON public.ramzan_contributions
  FOR ALL USING (public.is_whitelisted_user());

-- RAMZAN EXPENSES policies
CREATE POLICY "Whitelisted users can manage ramzan_expenses" ON public.ramzan_expenses
  FOR ALL USING (public.is_whitelisted_user());

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_collections_year_month ON public.collections(year, month);
CREATE INDEX idx_collections_date ON public.collections(date);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_ramzan_contributions_year ON public.ramzan_contributions(ramzan_year_id);
CREATE INDEX idx_ramzan_expenses_year ON public.ramzan_expenses(ramzan_year_id);
