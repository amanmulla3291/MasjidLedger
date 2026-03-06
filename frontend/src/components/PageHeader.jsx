export default function PageHeader({ title, subtitle, icon }) {
  return (
    <div className="d-flex align-items-center mb-4" style={{ paddingTop: '8px' }}>
      {icon && (
        <div
          style={{
            width: '44px', height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1a5c2a, #2e7d46)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginRight: '14px', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(26,92,42,0.3)',
          }}
        >
          <i className={`fas ${icon}`} style={{ color: '#fff', fontSize: '1.1rem' }} />
        </div>
      )}
      <div>
        <h4 style={{ margin: 0, fontFamily: 'Amiri, serif', color: '#1a2035', fontWeight: '700' }}>
          {title}
        </h4>
        {subtitle && (
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280', marginTop: '2px' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
