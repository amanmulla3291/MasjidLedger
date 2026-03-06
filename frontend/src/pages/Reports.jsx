import { useState } from 'react'
import { getCollections, getExpenses, getRamzanYears, getRamzanContributions } from '../lib/supabaseClient'
import { formatCurrency, getCurrentYear, getYearOptions, downloadCSV, downloadExcel, MONTHS } from '../utils/helpers'
import { generateLedgerPDF, generateExpensePDF, generateMonthlyCollectionPDF, generateRamzanPDF } from '../utils/pdfGenerator'
import PageHeader from '../components/PageHeader'
import toast from 'react-hot-toast'

export default function Reports() {
  const [loading, setLoading] = useState({})
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())

  function setLoad(key, val) {
    setLoading(prev => ({ ...prev, [key]: val }))
  }

  async function handleFullLedgerPDF() {
    setLoad('ledgerPDF', true)
    const [colRes, expRes] = await Promise.all([
      getCollections(selectedYear),
      getExpenses(selectedYear),
    ])
    generateLedgerPDF(selectedYear, colRes.data || [], expRes.data || [])
    toast.success('Ledger PDF generated!')
    setLoad('ledgerPDF', false)
  }

  async function handleLedgerCSV() {
    setLoad('ledgerCSV', true)
    const [colRes, expRes] = await Promise.all([
      getCollections(selectedYear),
      getExpenses(selectedYear),
    ])
    const entries = [
      ...(colRes.data || []).map(c => ({
        Date: c.date,
        Type: 'Income',
        Description: `Friday Donation${c.notes ? ' - ' + c.notes : ''}`,
        Income: c.amount,
        Expense: '',
      })),
      ...(expRes.data || []).map(e => ({
        Date: e.date,
        Type: 'Expense',
        Description: `${e.title} (${e.category})`,
        Income: '',
        Expense: e.amount,
      })),
    ].sort((a, b) => new Date(a.Date) - new Date(b.Date))
    downloadCSV(entries, `Ledger_${selectedYear}`)
    toast.success('CSV downloaded!')
    setLoad('ledgerCSV', false)
  }

  async function handleLedgerExcel() {
    setLoad('ledgerXLSX', true)
    const [colRes, expRes] = await Promise.all([
      getCollections(selectedYear),
      getExpenses(selectedYear),
    ])
    const entries = [
      ...(colRes.data || []).map(c => ({
        Date: c.date, Type: 'Income',
        Description: `Friday Donation${c.notes ? ' - ' + c.notes : ''}`,
        Income: c.amount, Expense: 0,
      })),
      ...(expRes.data || []).map(e => ({
        Date: e.date, Type: 'Expense',
        Description: `${e.title} (${e.category})`,
        Income: 0, Expense: e.amount,
      })),
    ].sort((a, b) => new Date(a.Date) - new Date(b.Date))
    downloadExcel(entries, `Ledger_${selectedYear}`)
    toast.success('Excel downloaded!')
    setLoad('ledgerXLSX', false)
  }

  async function handleCollectionsCSV() {
    setLoad('colCSV', true)
    const { data } = await getCollections(selectedYear)
    downloadCSV((data || []).map(c => ({
      Date: c.date,
      Month: MONTHS[c.month - 1],
      Year: c.year,
      Amount: c.amount,
      Notes: c.notes || '',
    })), `Collections_${selectedYear}`)
    toast.success('CSV downloaded!')
    setLoad('colCSV', false)
  }

  async function handleExpensesCSV() {
    setLoad('expCSV', true)
    const { data } = await getExpenses(selectedYear)
    downloadCSV((data || []).map(e => ({
      Date: e.date,
      Title: e.title,
      Category: e.category,
      Amount: e.amount,
      Notes: e.notes || '',
    })), `Expenses_${selectedYear}`)
    toast.success('CSV downloaded!')
    setLoad('expCSV', false)
  }

  async function handleExpensesPDF() {
    setLoad('expPDF', true)
    const { data } = await getExpenses(selectedYear)
    generateExpensePDF(selectedYear, data || [])
    toast.success('PDF generated!')
    setLoad('expPDF', false)
  }

  async function handleRamzanPDF() {
    setLoad('ramzanPDF', true)
    const { data: years } = await getRamzanYears()
    const ramzanYear = years?.find(y => y.year === selectedYear)
    if (!ramzanYear) {
      toast.error(`No Ramzan record for ${selectedYear}`)
      setLoad('ramzanPDF', false)
      return
    }
    const { data: contribs } = await getRamzanContributions(ramzanYear.id)
    if (!contribs?.length) {
      toast.error('No contributions to export')
      setLoad('ramzanPDF', false)
      return
    }
    generateRamzanPDF(ramzanYear, contribs)
    toast.success('Eid Report PDF generated!')
    setLoad('ramzanPDF', false)
  }

  async function handleRamzanCSV() {
    setLoad('ramzanCSV', true)
    const { data: years } = await getRamzanYears()
    const ramzanYear = years?.find(y => y.year === selectedYear)
    if (!ramzanYear) {
      toast.error(`No Ramzan record for ${selectedYear}`)
      setLoad('ramzanCSV', false)
      return
    }
    const { data: contribs } = await getRamzanContributions(ramzanYear.id)
    downloadCSV((contribs || []).map(c => ({
      Member: c.member_name,
      Amount: c.amount,
      Date: c.payment_date,
      Notes: c.notes || '',
    })), `Ramzan_Contributions_${selectedYear}`)
    toast.success('CSV downloaded!')
    setLoad('ramzanCSV', false)
  }

  const Btn = ({ id, className, icon, children }) => (
    <button
      className={`btn ${className}`}
      onClick={() => eval(`handle${id}`)()}
      disabled={loading[id.charAt(0).toLowerCase() + id.slice(1)]}
      style={{ minWidth: '140px' }}
    >
      {loading[id.charAt(0).toLowerCase() + id.slice(1)] ? (
        <span className="spinner-border spinner-border-sm mr-1" />
      ) : (
        <i className={`fas ${icon} mr-1`} />
      )}
      {children}
    </button>
  )

  return (
    <div>
      <PageHeader
        title="Reports & Export"
        subtitle="Download and print financial records in multiple formats"
        icon="fa-chart-bar"
      />

      {/* Year selector */}
      <div className="card mb-4">
        <div className="card-body py-2 d-flex align-items-center" style={{ gap: '12px' }}>
          <label style={{ margin: 0 }}>Select Year:</label>
          <select
            className="form-control form-control-sm"
            style={{ width: '100px' }}
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
          >
            {getYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
            All exports below will be for <strong>{selectedYear}</strong>
          </span>
        </div>
      </div>

      <div className="row">
        {/* Full Ledger */}
        <div className="col-lg-4 col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header" style={{ background: '#1a5c2a', color: '#fff' }}>
              <h6 className="mb-0">
                <i className="fas fa-book mr-2" />
                Full Financial Ledger
              </h6>
            </div>
            <div className="card-body">
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Combined income and expenses with running balance. Includes all Friday collections and Masjid expenses.
              </p>
              <div className="d-flex flex-column" style={{ gap: '8px' }}>
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleFullLedgerPDF}
                  disabled={loading.ledgerPDF}
                >
                  {loading.ledgerPDF ? <span className="spinner-border spinner-border-sm mr-1" /> : <i className="fas fa-file-pdf mr-1" />}
                  Download PDF
                </button>
                <button
                  className="btn btn-outline-success btn-sm"
                  onClick={handleLedgerCSV}
                  disabled={loading.ledgerCSV}
                >
                  {loading.ledgerCSV ? <span className="spinner-border spinner-border-sm mr-1" /> : <i className="fas fa-file-csv mr-1" />}
                  Download CSV
                </button>
                <button
                  className="btn btn-outline-success btn-sm"
                  onClick={handleLedgerExcel}
                  disabled={loading.ledgerXLSX}
                >
                  {loading.ledgerXLSX ? <span className="spinner-border spinner-border-sm mr-1" /> : <i className="fas fa-file-excel mr-1" />}
                  Download Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Friday Collections */}
        <div className="col-lg-4 col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header" style={{ background: '#1565c0', color: '#fff' }}>
              <h6 className="mb-0">
                <i className="fas fa-hand-holding-usd mr-2" />
                Friday Collections
              </h6>
            </div>
            <div className="card-body">
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                All Friday Sadaqah collections grouped by month with totals.
              </p>
              <div className="d-flex flex-column" style={{ gap: '8px' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleCollectionsCSV}
                  disabled={loading.colCSV}
                >
                  {loading.colCSV ? <span className="spinner-border spinner-border-sm mr-1" /> : <i className="fas fa-file-csv mr-1" />}
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="col-lg-4 col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header" style={{ background: '#b71c1c', color: '#fff' }}>
              <h6 className="mb-0">
                <i className="fas fa-file-invoice-dollar mr-2" />
                Expenses Report
              </h6>
            </div>
            <div className="card-body">
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                All Masjid expenses including repairs, utilities, and maintenance.
              </p>
              <div className="d-flex flex-column" style={{ gap: '8px' }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleExpensesPDF}
                  disabled={loading.expPDF}
                >
                  {loading.expPDF ? <span className="spinner-border spinner-border-sm mr-1" /> : <i className="fas fa-file-pdf mr-1" />}
                  Download PDF
                </button>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleExpensesCSV}
                  disabled={loading.expCSV}
                >
                  {loading.expCSV ? <span className="spinner-border spinner-border-sm mr-1" /> : <i className="fas fa-file-csv mr-1" />}
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ramzan Report */}
        <div className="col-lg-4 col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header" style={{ background: '#c9a227', color: '#fff' }}>
              <h6 className="mb-0">
                <i className="fas fa-moon mr-2" />
                Ramzan / Eid Report
              </h6>
            </div>
            <div className="card-body">
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Ramzan contribution report for Eid. Lists all members with amounts — printable format.
              </p>
              <div className="d-flex flex-column" style={{ gap: '8px' }}>
                <button
                  className="btn btn-warning btn-sm"
                  onClick={handleRamzanPDF}
                  disabled={loading.ramzanPDF}
                >
                  {loading.ramzanPDF ? <span className="spinner-border spinner-border-sm mr-1" /> : <i className="fas fa-file-pdf mr-1" />}
                  Eid Report PDF
                </button>
                <button
                  className="btn btn-outline-warning btn-sm"
                  onClick={handleRamzanCSV}
                  disabled={loading.ramzanCSV}
                >
                  {loading.ramzanCSV ? <span className="spinner-border spinner-border-sm mr-1" /> : <i className="fas fa-file-csv mr-1" />}
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print tip */}
      <div className="alert" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
        <i className="fas fa-lightbulb mr-2" style={{ color: '#15803d' }} />
        <strong>Tip:</strong> PDF reports are print-ready. Open the PDF and press <kbd>Ctrl+P</kbd> (or <kbd>Cmd+P</kbd> on Mac) to print.
      </div>
    </div>
  )
}
