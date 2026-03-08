import { useEffect, useState } from 'react'
import { getDashboardStats } from '../lib/supabaseClient'
import { formatCurrency, MONTHS, getCurrentYear } from '../utils/helpers'
import { Bar, Doughnut } from 'react-chartjs-2'
import PageHeader from '../components/PageHeader'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

function StatCard({ icon, iconBg, label, value, valueColor }) {
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
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const year = getCurrentYear()

  useEffect(() => {
    getDashboardStats().then(s => {
      setStats(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="text-center py-5">
      <div className="spinner-border text-success" />
    </div>
  )

  const monthLabels = MONTHS.map(m => m.slice(0, 3))
  const collectionData = stats?.monthlyTotals || Array(12).fill(0)

  const categoryLabels = Object.keys(stats?.categoryTotals || {})
  const categoryValues = Object.values(stats?.categoryTotals || {})

  const barData = {
    labels: monthLabels,
    datasets: [{
      label: 'Collection (₹)',
      data: collectionData,
      backgroundColor: 'rgba(26, 92, 42, 0.75)',
      borderColor: '#1a5c2a',
      borderWidth: 1,
      borderRadius: 4,
    }],
  }

  const doughnutData = {
    labels: categoryLabels.length ? categoryLabels : ['No Data'],
    datasets: [{
      data: categoryValues.length ? categoryValues : [1],
      backgroundColor: [
        '#1a5c2a','#c9a227','#b71c1c','#1565c0',
        '#6a1b9a','#e65100','#00695c','#37474f',
      ],
      borderWidth: 0,
    }],
  }

  const balance = (stats?.totalCollection || 0) - (stats?.totalExpenses || 0)

  return (
    <div>
      <PageHeader
        title={`Dashboard — ${year}`}
        subtitle="Overview of this month's finances"
        icon="fa-tachometer-alt"
      />

      {/* Stat cards — 2 per row on mobile, 4 on desktop */}
      <div className="stat-cards-grid mb-3">
        <StatCard
          icon="fa-hand-holding-usd"
          iconBg="#1a5c2a"
          label="Collections This Month"
          value={formatCurrency(stats?.totalCollection)}
        />
        <StatCard
          icon="fa-file-invoice-dollar"
          iconBg="#b71c1c"
          label="Expenses This Month"
          value={formatCurrency(stats?.totalExpenses)}
        />
        <StatCard
          icon="fa-balance-scale"
          iconBg={balance >= 0 ? '#1565c0' : '#e65100'}
          label="Current Balance"
          value={formatCurrency(balance)}
          valueColor={balance >= 0 ? '#15803d' : '#b91c1c'}
        />
        <StatCard
          icon="fa-moon"
          iconBg="#c9a227"
          label="Ramzan Contributions"
          value={formatCurrency(stats?.ramzanTotal)}
        />
      </div>

      {/* Charts */}
      <div className="row mt-2">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0" style={{ fontFamily: 'Amiri, serif' }}>
                Monthly Collections — {year}
              </h5>
            </div>
            <div className="card-body">
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: v => `₹${Number(v).toLocaleString('en-IN')}`,
                        font: { size: 10 },
                      },
                      grid: { color: 'rgba(0,0,0,0.05)' },
                    },
                    x: { grid: { display: false } },
                  },
                }}
                height={80}
              />
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0" style={{ fontFamily: 'Amiri, serif' }}>
                Expense Categories
              </h5>
            </div>
            <div className="card-body">
              {categoryLabels.length > 0 ? (
                <>
                  <Doughnut
                    data={doughnutData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { font: { size: 10 }, padding: 10 },
                        },
                      },
                      cutout: '60%',
                    }}
                  />
                  <div className="mt-3">
                    {categoryLabels.map((cat, i) => (
                      <div key={cat} className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center">
                          <div style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            background: doughnutData.datasets[0].backgroundColor[i % 8],
                            marginRight: '8px', flexShrink: 0,
                          }} />
                          <span style={{ fontSize: '0.8rem' }}>{cat}</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                          {formatCurrency(categoryValues[i])}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-chart-pie fa-3x mb-2" style={{ opacity: 0.2 }} />
                  <p>No expense data for {year}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="row mt-2">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap" style={{ gap: '8px' }}>
                <a href="/collections" className="btn btn-success btn-sm">
                  <i className="fas fa-plus mr-1" /> Add Collection
                </a>
                <a href="/expenses" className="btn btn-danger btn-sm">
                  <i className="fas fa-plus mr-1" /> Add Expense
                </a>
                <a href="/ramzan" className="btn btn-warning btn-sm">
                  <i className="fas fa-moon mr-1" /> Ramzan
                </a>
                <a href="/ledger" className="btn btn-info btn-sm">
                  <i className="fas fa-book mr-1" /> Ledger
                </a>
                <a href="/reports" className="btn btn-secondary btn-sm">
                  <i className="fas fa-download mr-1" /> Reports
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
