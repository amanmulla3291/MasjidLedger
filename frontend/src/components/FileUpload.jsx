import { useState } from 'react'

export default function FileUpload({ label, accept = 'image/*', onFileSelect, currentUrl }) {
  const [preview, setPreview] = useState(null)
  const [fileName, setFileName] = useState('')

  function handleChange(e) {
    const file = e.target.files[0]
    if (!file) return

    setFileName(file.name)
    onFileSelect(file)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setPreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    setFileName(file.name)
    onFileSelect(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setPreview(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const inputId = `upload-${label.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div>
      <label style={{ textTransform: 'none', fontSize: '0.82rem' }}>{label}</label>
      <div
        className={`upload-zone ${fileName || currentUrl ? 'has-file' : ''}`}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => document.getElementById(inputId).click()}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          className="d-none"
          onChange={handleChange}
        />

        {preview ? (
          <div>
            <img
              src={preview}
              alt="preview"
              style={{ maxHeight: '120px', maxWidth: '100%', borderRadius: '6px', marginBottom: '8px' }}
            />
            <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{fileName}</div>
            <div style={{ fontSize: '0.72rem', color: '#1a5c2a', marginTop: '4px' }}>Click to change</div>
          </div>
        ) : fileName ? (
          <div>
            <i className="fas fa-file-pdf fa-2x" style={{ color: '#1a5c2a', marginBottom: '8px' }} />
            <div style={{ fontSize: '0.8rem', color: '#374151', fontWeight: '500' }}>{fileName}</div>
            <div style={{ fontSize: '0.72rem', color: '#1a5c2a', marginTop: '4px' }}>Click to change</div>
          </div>
        ) : currentUrl ? (
          <div>
            <i className="fas fa-check-circle fa-2x" style={{ color: '#1a5c2a', marginBottom: '8px' }} />
            <div style={{ fontSize: '0.8rem', color: '#374151' }}>File uploaded</div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '4px' }}>Click to replace</div>
          </div>
        ) : (
          <div>
            <i className="fas fa-cloud-upload-alt fa-2x" style={{ color: '#9ca3af', marginBottom: '8px' }} />
            <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
              Click or drag &amp; drop to upload
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '4px' }}>
              {accept === 'image/*' ? 'JPG, PNG, WEBP' : 'JPG, PNG, PDF'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
