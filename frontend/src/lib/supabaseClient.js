import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Whitelisted emails
export const WHITELISTED_EMAILS = [
  'amanmulla.aws@gmail.com',
  'altabmulla36@gmail.com',
  'pjilani4566@gmail.com',
]

export function isWhitelisted(email) {
  return WHITELISTED_EMAILS.includes(email?.toLowerCase())
}

// ============================================================
// AUTH HELPERS
// ============================================================
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ============================================================
// USER HELPERS
// ============================================================
export async function upsertUser(user) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email,
    }, { onConflict: 'email' })
    .select()
    .single()
  return { data, error }
}

// ============================================================
// COLLECTIONS
// ============================================================
export async function getCollections(year) {
  let query = supabase
    .from('collections')
    .select('*, denominations(*)')
    .order('date', { ascending: false })

  if (year) query = query.eq('year', year)

  const { data, error } = await query
  return { data, error }
}

export async function getCollectionsByMonth(year, month) {
  const { data, error } = await supabase
    .from('collections')
    .select('*, denominations(*)')
    .eq('year', year)
    .eq('month', month)
    .order('date', { ascending: true })
  return { data, error }
}

export async function addCollection({ date, amount, notes, denominations, userId }) {
  const d = new Date(date)
  const month = d.getMonth() + 1
  const year = d.getFullYear()

  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .insert({ date, amount, month, year, notes, created_by: userId })
    .select()
    .single()

  if (collectionError) return { error: collectionError }

  if (denominations) {
    const { error: denError } = await supabase
      .from('denominations')
      .insert({ collection_id: collection.id, ...denominations })
    if (denError) return { error: denError }
  }

  return { data: collection, error: null }
}

export async function deleteCollection(id) {
  const { error } = await supabase.from('collections').delete().eq('id', id)
  return { error }
}

// ============================================================
// EXPENSES
// ============================================================
export async function getExpenses(year) {
  let query = supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })

  if (year) {
    const start = `${year}-01-01`
    const end = `${year}-12-31`
    query = query.gte('date', start).lte('date', end)
  }

  const { data, error } = await query
  return { data, error }
}

export async function addExpense(expense) {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single()
  return { data, error }
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  return { error }
}

// ============================================================
// RAMZAN
// ============================================================
export async function getRamzanYears() {
  const { data, error } = await supabase
    .from('ramzan_year')
    .select('*')
    .order('year', { ascending: false })
  return { data, error }
}

export async function addRamzanYear(entry) {
  const { data, error } = await supabase
    .from('ramzan_year')
    .insert(entry)
    .select()
    .single()
  return { data, error }
}

export async function getRamzanContributions(ramzanYearId) {
  const { data, error } = await supabase
    .from('ramzan_contributions')
    .select('*')
    .eq('ramzan_year_id', ramzanYearId)
    .order('payment_date', { ascending: true })
  return { data, error }
}

export async function addRamzanContribution(contribution) {
  const { data, error } = await supabase
    .from('ramzan_contributions')
    .insert(contribution)
    .select()
    .single()
  return { data, error }
}

export async function deleteRamzanContribution(id) {
  const { error } = await supabase.from('ramzan_contributions').delete().eq('id', id)
  return { error }
}

export async function getRamzanExpenses(ramzanYearId) {
  const { data, error } = await supabase
    .from('ramzan_expenses')
    .select('*')
    .eq('ramzan_year_id', ramzanYearId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function addRamzanExpense(expense) {
  const { data, error } = await supabase
    .from('ramzan_expenses')
    .insert(expense)
    .select()
    .single()
  return { data, error }
}

export async function deleteRamzanExpense(id) {
  const { error } = await supabase.from('ramzan_expenses').delete().eq('id', id)
  return { error }
}

// ============================================================
// DASHBOARD STATS
// ============================================================
export async function getDashboardStats() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [collections, expenses, ramzanYears] = await Promise.all([
    supabase
      .from('collections')
      .select('amount')
      .eq('month', month)
      .eq('year', year),
    supabase
      .from('expenses')
      .select('amount')
      .gte('date', `${year}-${String(month).padStart(2,'0')}-01`)
      .lte('date', `${year}-${String(month).padStart(2,'0')}-31`),
    supabase
      .from('ramzan_year')
      .select('id, year')
      .eq('year', year)
      .single(),
  ])

  const totalCollection = collections.data?.reduce((s, r) => s + Number(r.amount), 0) || 0
  const totalExpenses = expenses.data?.reduce((s, r) => s + Number(r.amount), 0) || 0

  let ramzanTotal = 0
  if (ramzanYears.data?.id) {
    const { data: contribs } = await supabase
      .from('ramzan_contributions')
      .select('amount')
      .eq('ramzan_year_id', ramzanYears.data.id)
    ramzanTotal = contribs?.reduce((s, r) => s + Number(r.amount), 0) || 0
  }

  // Monthly chart data (current year)
  const { data: monthlyData } = await supabase
    .from('collections')
    .select('month, amount')
    .eq('year', year)

  const monthlyTotals = Array(12).fill(0)
  monthlyData?.forEach(r => {
    monthlyTotals[r.month - 1] += Number(r.amount)
  })

  // Expense categories
  const { data: expenseData } = await supabase
    .from('expenses')
    .select('category, amount')
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)

  const categoryTotals = {}
  expenseData?.forEach(r => {
    categoryTotals[r.category] = (categoryTotals[r.category] || 0) + Number(r.amount)
  })

  return {
    totalCollection,
    totalExpenses,
    balance: totalCollection - totalExpenses,
    ramzanTotal,
    monthlyTotals,
    categoryTotals,
  }
}

// ============================================================
// FILE UPLOAD HELPERS
// ============================================================
export async function uploadFile(bucket, file, path) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true })

  if (error) return { url: null, error }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  // For private buckets, use signed URL
  const { data: signedData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 year

  return { url: data.path, signedUrl: signedData?.signedUrl, error: null }
}

export async function getSignedUrl(bucket, path) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60) // 1 hour
  return { url: data?.signedUrl, error }
}
