# 🕌 Masjid Ledger

Private digital financial ledger for a Masjid. Records Friday Sadaqah collections, repair expenses, Ramzan Hafiz contributions, and generates printable reports.

---

## ✨ Features

- **Friday Collections** — Denomination counter (₹1–₹100) with auto-calculation or manual entry for historical records
- **Expense Management** — Upload before/after repair photos and bill images
- **Ramzan Management** — Track member contributions (20+ members @ ₹1000 each) and Hafiz-related expenses
- **Eid Report PDF** — Print-ready contribution report for Eid day
- **Full Ledger** — Unified income/expense view with running balance
- **Export** — CSV, Excel, PDF for all records
- **Secure** — Google OAuth only, 2-person whitelist, Supabase RLS
- **Mobile Friendly** — AdminLTE responsive dashboard

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite) |
| UI | AdminLTE 3 + Bootstrap 4 |
| Database | Supabase PostgreSQL |
| Auth | Supabase Google OAuth |
| Storage | Supabase Storage |
| Charts | Chart.js + react-chartjs-2 |
| PDF | jsPDF + jspdf-autotable |
| Hosting | Vercel |

---

## 📁 Project Structure

```
masjid-ledger/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Collections.jsx
│   │   │   ├── Expenses.jsx
│   │   │   ├── Ledger.jsx
│   │   │   ├── Ramzan.jsx
│   │   │   └── Reports.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── DenominationCounter.jsx
│   │   │   ├── FileUpload.jsx
│   │   │   └── PageHeader.jsx
│   │   ├── lib/
│   │   │   └── supabaseClient.js     ← All DB/API calls
│   │   ├── utils/
│   │   │   ├── helpers.js
│   │   │   └── pdfGenerator.js
│   │   ├── hooks/
│   │   │   └── useAuth.jsx
│   │   └── styles/
│   │       └── app.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── supabase/
│   ├── schema.sql                    ← Run this first
│   └── storage.sql                   ← Run this second
├── vercel.json
└── README.md
```

---

## 🚀 Setup Instructions

### Step 1 — Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **Anon Key** from Settings → API

### Step 2 — Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `supabase/schema.sql`
3. Click **Run**

### Step 3 — Setup Storage Buckets

1. In Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `supabase/storage.sql`
3. Click **Run**

> Alternatively, create buckets manually in **Storage** dashboard:
> - `expense-images` (Private)
> - `expense-bills` (Private)
> - `ramzan-bills` (Private)
> - `ramzan-images` (Private)

### Step 4 — Enable Google OAuth

1. In Supabase: **Authentication → Providers → Google**
2. Enable Google provider
3. Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com):
   - Create new project → APIs & Services → Credentials → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Authorized redirect URIs: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Paste Client ID and Secret into Supabase Google provider settings
5. Save

### Step 5 — Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/masjid-ledger.git
cd masjid-ledger/frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env and add your Supabase URL and Anon Key:
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...

# Start development server
npm run dev
# Opens at http://localhost:3000
```

### Step 6 — Deploy to Vercel

**Option A — Vercel Dashboard (recommended)**

1. Push repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Set **Root Directory** to `frontend`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

**Option B — Vercel CLI**

```bash
npm install -g vercel
cd frontend
vercel --prod
# Follow prompts, add env vars when asked
```

### Step 7 — Configure OAuth Redirect for Production

After Vercel deployment:

1. In Google Cloud Console → OAuth Credentials, add:
   - Authorized JavaScript origins: `https://your-app.vercel.app`
   - Authorized redirect URIs: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

2. In Supabase → Authentication → URL Configuration, add:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/dashboard`

---

## 🔐 Security

- Only two emails are permitted: `amanmulla.aws@gmail.com` and `altablumma36@gmail.com`
- Any other Google account that signs in is automatically signed out
- Supabase Row Level Security (RLS) is enabled on all tables
- A custom `is_whitelisted_user()` function enforces access at the database level
- File storage buckets are private — access via signed URLs only

---

## 📱 Pages Reference

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | Monthly stats, charts, quick actions |
| `/collections` | Friday Collections | Add/view Sadaqah with denomination counter |
| `/expenses` | Expenses | Track repairs with photo uploads |
| `/ledger` | Ledger | Unified financial view with balance |
| `/ramzan` | Ramzan | Contribution tracking & Hafiz expenses |
| `/reports` | Reports | Export CSV, Excel, PDF |

---

## 📄 PDF Reports

| Report | Content |
|--------|---------|
| Full Ledger PDF | All income + expenses, year view, running balance |
| Monthly Collections PDF | Single month's Friday collections |
| Expense Report PDF | All expenses for the year by category |
| Eid Report PDF | Ramzan contributions — printable for Eid day |

---

## 🗄 Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Authorized users |
| `collections` | Friday Sadaqah records |
| `denominations` | Note/coin breakdown per collection |
| `expenses` | Masjid expenses with photo URLs |
| `ramzan_year` | One record per Ramzan year |
| `ramzan_contributions` | Member contributions per year |
| `ramzan_expenses` | Hafiz-related expenses per year |

---

## 🐛 Troubleshooting

**"Access denied" after login**
→ Make sure the email is in `WHITELISTED_EMAILS` in `supabaseClient.js` and the RLS policy.

**OAuth redirect error**
→ Check that your Vercel URL is added to both Google OAuth and Supabase redirect URLs.

**Images not loading**
→ Check storage bucket policies. Buckets must have RLS policies for signed URL access.

**Charts not rendering**
→ ChartJS components must be wrapped in the registered chart check. `getDashboardStats` must return data.

---

## 📞 Usage Notes

- **Historical records**: Skip the denomination counter and enter only the total amount for past records
- **Denomination counter**: Toggle ON to count notes by denomination — total auto-populates
- **File uploads**: Supports JPG, PNG, WEBP for photos; JPG, PNG, PDF for bills
- **Ramzan years**: Create a new Ramzan year entry before adding contributions
- **Balance formula**: Total Collections (all years) − Total Expenses (all years)

---

*Masjid Ledger — Private Financial Records System*
