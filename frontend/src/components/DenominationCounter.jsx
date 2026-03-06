import { useState, useEffect } from 'react'
import { calculateDenominationTotal, formatCurrency } from '../utils/helpers'

const DENOMINATIONS = [
  { key: 'one_rupee',     label: '₹1',   value: 1   },
  { key: 'two_rupee',     label: '₹2',   value: 2   },
  { key: 'five_rupee',    label: '₹5',   value: 5   },
  { key: 'ten_rupee',     label: '₹10',  value: 10  },
  { key: 'twenty_rupee',  label: '₹20',  value: 20  },
  { key: 'fifty_rupee',   label: '₹50',  value: 50  },
  { key: 'hundred_rupee', label: '₹100', value: 100 },
]

const defaultCounts = Object.fromEntries(DENOMINATIONS.map(d => [d.key, '']))

export default function DenominationCounter({ onChange }) {
  const [counts, setCounts] = useState(defaultCounts)
  const [enabled, setEnabled] = useState(false)

  const total = calculateDenominationTotal(
    Object.fromEntries(
      Object.entries(counts).map(([k, v]) => [k, parseInt(v) || 0])
    )
  )

  useEffect(() => {
    if (enabled) {
      const numericCounts = Object.fromEntries(
        Object.entries(counts).map(([k, v]) => [k, parseInt(v) || 0])
      )
      onChange({ denominations: numericCounts, total })
    } else {
      onChange({ denominations: null, total: null })
    }
  }, [counts, enabled])

  function handleChange(key, value) {
    const num = value === '' ? '' : Math.max(0, parseInt(value) || 0)
    setCounts(prev => ({ ...prev, [key]: num }))
  }

  function reset() {
    setCounts(defaultCounts)
  }

  return (
    <div className="card card-outline card-success mb-0">
      <div className="card-header d-flex align-items-center justify-content-between" style={{ padding: '10px 16px' }}>
        <div className="d-flex align-items-center gap-2">
          <div className="custom-control custom-switch">
            <input
              type="checkbox"
              className="custom-control-input"
              id="denomSwitch"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
            />
            <label className="custom-control-label" htmlFor="denomSwitch" style={{ textTransform: 'none', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>
              Use Denomination Counter
            </label>
          </div>
        </div>
        {enabled && (
          <button type="button" className="btn btn-xs btn-outline-secondary" onClick={reset}>
            Reset
          </button>
        )}
      </div>

      {enabled && (
        <div className="card-body" style={{ padding: '16px' }}>
          <div className="denomination-grid">
            {DENOMINATIONS.map(({ key, label, value }) => {
              const count = parseInt(counts[key]) || 0
              const subtotal = count * value
              return (
                <div key={key} className={`denomination-item ${count > 0 ? 'active' : ''}`}
                  style={count > 0 ? { borderColor: '#1a5c2a', background: '#f0fdf4' } : {}}>
                  <div className="denomination-note">{label}</div>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm text-center"
                    placeholder="0"
                    value={counts[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    style={{ fontWeight: '600' }}
                  />
                  {count > 0 && (
                    <div className="denomination-subtotal">
                      {count} × {label} = ₹{subtotal.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="denomination-total-banner mt-3">
            <div>
              <div className="total-label">Calculated Total</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>From denomination counts above</div>
            </div>
            <div className="total-amount">₹{total.toLocaleString('en-IN')}</div>
          </div>

          {/* Breakdown */}
          {total > 0 && (
            <div className="mt-2">
              <small className="text-muted">
                {DENOMINATIONS
                  .filter(d => parseInt(counts[d.key]) > 0)
                  .map(d => `${counts[d.key]}×${d.label}`)
                  .join(' + ')}
              </small>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
