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

  const balance = stats?.allTimeBalance || 0

  return (
    <div>
      <PageHeader
        title={`Dashboard — ${year}`}
        subtitle="Overview of this month's finances"
        icon="fa-tachometer-alt"
      />

      {/* Info boxes */}
      <div className="row">
        <div className="col-6 col-lg-3">
          <div className="info-box">
            <span className="info-box-icon" style={{ background: '#1a5c2a', color: '#fff' }}>
              <i className="fas fa-hand-holding-usd" />
            </span>
            <div className="info-box-content">
              <span className="info-box-text">Collections This Month</span>
              <span className="info-box-number">{formatCurrency(stats?.totalCollection)}</span>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="info-box">
            <span className="info-box-icon" style={{ background: '#b71c1c', color: '#fff' }}>
              <i className="fas fa-file-invoice-dollar" />
            </span>
            <div className="info-box-content">
              <span className="info-box-text">Expenses This Month</span>
              <span className="info-box-number">{formatCurrency(stats?.totalExpenses)}</span>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="info-box">
            <span className="info-box-icon" style={{ background: balance >= 0 ? '#1565c0' : '#e65100', color: '#fff' }}>
              <i className="fas fa-balance-scale" />
            </span>
            <div className="info-box-content">
              <span className="info-box-text">Total Balance (All Time)</span>
              <span className="info-box-number" style={{ color: balance >= 0 ? '#15803d' : '#b91c1c' }}>
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="info-box">
            <span className="info-box-icon" style={{ background: '#c9a227', color: '#fff' }}>
              <i className="fas fa-moon" />
            </span>
            <div className="info-box-content">
              <span className="info-box-text">Ramzan Contributions</span>
              <span className="info-box-number">{formatCurrency(stats?.ramzanTotal)}</span>
            </div>
          </div>
        </div>
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
              <div className="d-flex flex-wrap gap-2" style={{ gap: '10px' }}>
                <a href="/collections" className="btn btn-success btn-sm">
                  <i className="fas fa-plus mr-1" /> Add Friday Collection
                </a>
                <a href="/expenses" className="btn btn-danger btn-sm">
                  <i className="fas fa-plus mr-1" /> Add Expense
                </a>
                <a href="/ramzan" className="btn btn-warning btn-sm">
                  <i className="fas fa-moon mr-1" /> Ramzan Management
                </a>
                <a href="/ledger" className="btn btn-info btn-sm">
                  <i className="fas fa-book mr-1" /> View Ledger
                </a>
                <a href="/reports" className="btn btn-secondary btn-sm">
                  <i className="fas fa-download mr-1" /> Export Reports
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}