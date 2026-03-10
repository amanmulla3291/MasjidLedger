import { useEffect, useState } from 'react'
import { getDashboardStats, supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, MONTHS, getCurrentYear } from '../utils/helpers'
import { Bar, Doughnut } from 'react-chartjs-2'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

function StatCard({ icon, iconBg, label, value, valueColor, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: iconBg }}>
        <i className={`fas ${icon}`} />
      </div>
      <div className="stat-card-body">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value" style={valueColor ? { color: valueColor } : {}}>
          {value}
        </div>
        {sub && <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>{sub}</div>}
      </div>
    </div>
  )
}

const DOUGHNUT_COLORS = ['#1a5c2a','#c9a227','#b71c1c','#1565c0','#6a1b9a','#e65100','#00695c','#37474f']
const INCOME_COLORS   = ['#15803d','#0284c7','#7c3aed','#b45309','#0891b2','#be123c','#065f46','#1d4ed8']

export default function Dashboard() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const year = getCurrentYear()

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      loadRecentActivity(),
    ]).then(([s]) => {
      setStats(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function loadRecentActivity() {
    const [cols, exps, incs] = await Promise.all([
      supabase.from('collections').select('id,date,amount,notes').order('date', { ascending: false }).limit(5),
      supabase.from('expenses').select('id,date,amount,title,category').order('date', { ascending: false }).limit(5),
      supabase.from('income').select('id,date,amount,category,donor_name').order('date', { ascending: false }).limit(5),
    ])
    const entries = [
      ...(cols.data || []).map(c => ({ id: c.id, date: c.date, type: 'collection', label: `Friday Collection${c.notes ? ' — ' + c.notes : ''}`, amount: Number(c.amount) })),
      ...(exps.data || []).map(e => ({ id: e.id, date: e.date, type: 'expense', label: `${e.title} (${e.category})`, amount: Number(e.amount) })),
      ...(incs.data || []).map(i => ({ id: i.id, date: i.date, type: 'income', label: `${i.category} — ${i.donor_name}`, amount: Number(i.amount) })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 9)
    setRecentActivity(entries)
  }

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-success" /></div>

  const monthLabels = MONTHS.map(m => m.slice(0, 3))
  const collectionData = stats?.monthlyTotals || Array(12).fill(0)
  const incomeData = stats?.monthlyIncomeTotals || Array(12).fill(0)
  const expenseData = stats?.monthlyExpenseTotals || Array(12).fill(0)

  // Expense category doughnut
  const catLabels = Object.keys(stats?.categoryTotals || {})
  const catValues = Object.values(stats?.categoryTotals || {})

  // Income category doughnut — computed from monthlyIncome by category if available
  // Falls back to empty; getDashboardStats already returns incomeCategoryTotals if we add it
  const incCatLabels = Object.keys(stats?.incomeCategoryTotals || {})
  const incCatValues = Object.values(stats?.incomeCategoryTotals || {})

  const barData = {
    labels: monthLabels,
    datasets: [
      { label: 'Collections', data: collectionData, backgroundColor: 'rgba(26,92,42,0.8)', borderColor: '#1a5c2a', borderWidth: 1, borderRadius: 3 },
      { label: 'Income', data: incomeData, backgroundColor: 'rgba(21,128,61,0.5)', borderColor: '#15803d', borderWidth: 1, borderRadius: 3 },
      { label: 'Expenses', data: expenseData, backgroundColor: 'rgba(183,28,28,0.7)', borderColor: '#b71c1c', borderWidth: 1, borderRadius: 3 },
    ],
  }

  const doughnutOpts = (colors) => ({
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}` } },
    },
    cutout: '65%',
  })

  const balance = stats?.allTimeBalance || 0
  const thisMonthNet = (stats?.totalCollection || 0) + (stats?.totalMonthIncome || 0) - (stats?.totalExpenses || 0)

  const typeIcon  = { collection: 'fa-hand-holding-usd', expense: 'fa-file-invoice-dollar', income: 'fa-money-bill-wave' }
  const typeColor = { collection: '#1a5c2a', expense: '#b71c1c', income: '#15803d' }

  return (
    <div>
      <PageHeader title={`Dashboard — ${year}`} subtitle="Overview of finances and recent activity" icon="fa-tachometer-alt" />

      {/* Stat cards */}
      <div className="stat-cards-grid mb-3">
        <StatCard icon="fa-hand-holding-usd" iconBg="#1a5c2a" label="Collections This Month" value={formatCurrency(stats?.totalCollection)} sub="Friday Sadaqah" />
        <StatCard icon="fa-money-bill-wave" iconBg="#15803d" label="Other Income This Month" value={formatCurrency(stats?.totalMonthIncome || 0)} sub="Zakat, Donations etc." />
        <StatCard icon="fa-file-invoice-dollar" iconBg="#b71c1c" label="Expenses This Month" value={formatCurrency(stats?.totalExpenses)} sub="Repairs, Utilities etc." />
        <StatCard
          icon="fa-balance-scale"
          iconBg={balance >= 0 ? '#1565c0' : '#e65100'}
          label="All-Time Balance"
          value={formatCurrency(balance)}
          valueColor={balance >= 0 ? '#15803d' : '#b91c1c'}
          sub={balance >= 0 ? 'Surplus' : 'Deficit'}
        />
      </div>

      {/* Month net banner */}
      <div className="card mb-3" style={{
        background: thisMonthNet >= 0 ? 'linear-gradient(135deg,#1a5c2a,#2d7a3e)' : 'linear-gradient(135deg,#b71c1c,#d32f2f)',
        color: '#fff', border: 'none',
      }}>
        <div className="card-body py-3 d-flex align-items-center justify-content-between flex-wrap" style={{ gap: '10px' }}>
          <div>
            <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>This Month Net ({MONTHS[new Date().getMonth()]} {year})</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'Amiri, serif' }}>
              {formatCurrency(Math.abs(thisMonthNet))}
              <span style={{ fontSize: '0.9rem', marginLeft: '8px', opacity: 0.85 }}>{thisMonthNet >= 0 ? 'surplus' : 'deficit'}</span>
            </div>
          </div>
          <div className="d-flex" style={{ gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>Total In</div>
              <div style={{ fontWeight: 600 }}>{formatCurrency((stats?.totalCollection || 0) + (stats?.totalMonthIncome || 0))}</div>
            </div>
            <div style={{ opacity: 0.4, fontSize: '1.2rem' }}>−</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>Total Out</div>
              <div style={{ fontWeight: 600 }}>{formatCurrency(stats?.totalExpenses || 0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart + Recent Activity */}
      <div className="row mt-2">
        <div className="col-lg-8 mb-3 mb-lg-0">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0" style={{ fontFamily: 'Amiri, serif' }}>Income vs Expenses — {year}</h5>
              <small className="text-muted">Monthly breakdown</small>
            </div>
            <div className="card-body">
              <Bar data={barData} options={{
                responsive: true,
                plugins: {
                  legend: { display: true, position: 'top', labels: { font: { size: 10 }, padding: 12, boxWidth: 12 } },
                  tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}` } },
                },
                scales: {
                  y: { beginAtZero: true, ticks: { callback: v => `₹${Number(v).toLocaleString('en-IN')}`, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                  x: { grid: { display: false } },
                },
              }} height={95} />
            </div>
          </div>
        </div>

        {/* Recent Activity feed */}
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0" style={{ fontFamily: 'Amiri, serif' }}>Recent Activity</h5>
              <a href="/ledger" style={{ fontSize: '0.78rem', color: '#1a5c2a', textDecoration: 'none' }}>View all →</a>
            </div>
            <div className="card-body p-0" style={{ overflowY: 'auto', maxHeight: '340px' }}>
              {recentActivity.length === 0 ? (
                <div className="text-center py-4 text-muted" style={{ fontSize: '0.85rem' }}>No recent transactions</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {recentActivity.map((entry, i) => (
                    <li key={`${entry.type}-${entry.id}-${i}`} className="list-group-item px-3 py-2" style={{ border: 'none', borderBottom: '1px solid #f3f4f6' }}>
                      <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                          background: typeColor[entry.type] + '18',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <i className={`fas ${typeIcon[entry.type]}`} style={{ fontSize: '0.75rem', color: typeColor[entry.type] }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {entry.label}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{formatDate(entry.date)}</div>
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, flexShrink: 0, color: entry.type === 'expense' ? '#b91c1c' : '#15803d' }}>
                          {entry.type === 'expense' ? '−' : '+'}{formatCurrency(entry.amount)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Doughnut charts row */}
      <div className="row mt-3">
        {/* Expense categories */}
        <div className="col-lg-6 mb-3 mb-lg-0">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0" style={{ fontFamily: 'Amiri, serif' }}>Expense Categories — {year}</h5>
            </div>
            <div className="card-body">
              {catLabels.length > 0 ? (
                <div className="row align-items-center">
                  <div className="col-5">
                    <Doughnut
                      data={{ labels: catLabels, datasets: [{ data: catValues, backgroundColor: DOUGHNUT_COLORS, borderWidth: 0 }] }}
                      options={doughnutOpts(DOUGHNUT_COLORS)}
                    />
                  </div>
                  <div className="col-7">
                    {catLabels.map((cat, i) => (
                      <div key={cat} className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center">
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: DOUGHNUT_COLORS[i % 8], marginRight: '6px', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.75rem' }}>{cat}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{formatCurrency(catValues[i])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-chart-pie fa-3x mb-2" style={{ opacity: 0.2 }} />
                  <p className="mb-0">No expense data for {year}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Income categories */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0" style={{ fontFamily: 'Amiri, serif' }}>Income Categories — {year}</h5>
            </div>
            <div className="card-body">
              {incCatLabels.length > 0 ? (
                <div className="row align-items-center">
                  <div className="col-5">
                    <Doughnut
                      data={{ labels: incCatLabels, datasets: [{ data: incCatValues, backgroundColor: INCOME_COLORS, borderWidth: 0 }] }}
                      options={doughnutOpts(INCOME_COLORS)}
                    />
                  </div>
                  <div className="col-7">
                    {incCatLabels.map((cat, i) => (
                      <div key={cat} className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center">
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: INCOME_COLORS[i % 8], marginRight: '6px', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.75rem' }}>{cat}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{formatCurrency(incCatValues[i])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-chart-pie fa-3x mb-2" style={{ opacity: 0.2 }} />
                  <p className="mb-0">No income data for {year}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ramzan progress */}
      {stats?.ramzanTotal > 0 && stats?.ramzanExpected > 0 && (
        <div className="card mt-3">
          <div className="card-header">
            <h5 className="card-title mb-0" style={{ fontFamily: 'Amiri, serif' }}>
              <i className="fas fa-moon mr-2" style={{ color: '#c9a227' }} />
              Ramzan {year} — Salary Progress
            </h5>
          </div>
          <div className="card-body">
            <div className="d-flex justify-content-between mb-1">
              <small className="text-muted">{formatCurrency(stats.ramzanTotal)} collected of {formatCurrency(stats.ramzanExpected)} target</small>
              <small className="font-weight-bold">{Math.round((stats.ramzanTotal / stats.ramzanExpected) * 100)}%</small>
            </div>
            <div className="progress" style={{ height: '10px' }}>
              <div className="progress-bar bg-warning" style={{ width: `${Math.min(100, (stats.ramzanTotal / stats.ramzanExpected) * 100)}%` }} />
            </div>
            <small className="text-muted mt-1 d-block">
              {stats.ramzanContribCount} members contributed · {formatCurrency(stats.ramzanExpected - stats.ramzanTotal)} remaining
            </small>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="card mt-3">
        <div className="card-header"><h5 className="card-title mb-0">Quick Actions</h5></div>
        <div className="card-body">
          <div className="d-flex flex-wrap" style={{ gap: '8px' }}>
            {isAdmin && (
              <>
                <a href="/collections" className="btn btn-success btn-sm"><i className="fas fa-plus mr-1" /> Add Collection</a>
                <a href="/expenses" className="btn btn-danger btn-sm"><i className="fas fa-plus mr-1" /> Add Expense</a>
                <a href="/income" className="btn btn-outline-success btn-sm"><i className="fas fa-plus mr-1" /> Add Income</a>
              </>
            )}
            <a href="/ramzan" className="btn btn-warning btn-sm"><i className="fas fa-moon mr-1" /> Ramzan</a>
            <a href="/ledger" className="btn btn-info btn-sm"><i className="fas fa-book mr-1" /> Ledger</a>
            {isAdmin && <a href="/reports" className="btn btn-secondary btn-sm"><i className="fas fa-download mr-1" /> Reports</a>}
          </div>
        </div>
      </div>
    </div>
  )
}