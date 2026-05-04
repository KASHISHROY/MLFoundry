import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

interface ParsedCSV {
  headers:   string[]
  rows:      string[][]
  totalRows: number
}

export default function Upload() {
  const navigate     = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile]           = useState<File | null>(null)
  const [parsed, setParsed]       = useState<ParsedCSV | null>(null)
  const [targetColumn, setTarget] = useState('')
  const [dragging, setDragging]   = useState(false)
  const [error, setError]         = useState('')
  const [uploading, setUploading] = useState(false)
  const [cachedMsg, setCachedMsg] = useState('')

  const ALLOWED = ['.csv', '.xlsx', '.xls', '.json', '.parquet', '.tsv']

  function parseFile(f: File) {
    setError('')
    setFile(null)
    setParsed(null)
    setTarget('')
    setCachedMsg('')

    if (!ALLOWED.some(ext => f.name.toLowerCase().endsWith(ext))) {
      setError(`Unsupported file. Allowed: ${ALLOWED.join(', ')}`)
      return
    }

    if (f.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum 50MB')
      return
    }

    const isCSV = f.name.toLowerCase().endsWith('.csv')

    if (isCSV) {
      Papa.parse(f, {
        complete: (results) => {
          const allRows  = results.data as string[][]
          const headers  = allRows[0]
          const dataRows = allRows.slice(1).filter(r => r.some(c => c !== ''))

          if (!headers || headers.length === 0) {
            setError('CSV appears to be empty')
            return
          }

          setParsed({
            headers,
            rows:      dataRows.slice(0, 5),
            totalRows: dataRows.length,
          })
          setFile(f)
          setTarget(headers[headers.length - 1])
        },
        error: () => setError('Failed to parse CSV file'),
      })
    } else {
      // Non-CSV: no client-side preview
      setFile(f)
      setParsed({
        headers:   ['Preview not available for this format'],
        rows:      [['Server will parse the file and show columns during training.']],
        totalRows: 0,
      })
    }
  }

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) parseFile(dropped)
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) parseFile(selected)
  }

  async function handleUpload() {
    if (!file || !targetColumn) return
    setUploading(true)
    setError('')
    setCachedMsg('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('target_column', targetColumn)

      const response = await api.post('/datasets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      // Check if cached result returned
      if (response.data.cached) {
        setCachedMsg(response.data.cache_message)
        setTimeout(() => {
          navigate(`/results/${response.data.job_id}`)
        }, 2000)
        return
      }

      navigate(`/jobs/${response.data.job_id}`)

    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Upload failed'
      if (err.response?.status === 403) {
        setError(detail + ' Go to /upgrade to get Pro.')
      } else {
        setError(detail)
      }
    } finally {
      setUploading(false)
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024)         return `${bytes} B`
    if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isNonCSV = file && !file.name.toLowerCase().endsWith('.csv')

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-4xl animate-fade-in">

        {/* Header */}
        <div className="mb-8">
          <h1 style={{ color: '#E5E7EB' }} className="text-2xl font-semibold mb-1">
            Upload Dataset
          </h1>
          <p style={{ color: '#6B7280' }} className="text-sm">
            Upload a dataset and our AI agents will train the best model automatically.
            Supports CSV, Excel, JSON, Parquet, TSV.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{
            backgroundColor: dragging ? 'rgba(99,102,241,0.08)' : '#111827',
            border: `2px dashed ${dragging ? '#6366F1' : file ? '#22C55E' : '#374151'}`,
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }}
          className="rounded-2xl p-12 text-center mb-6"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json,.parquet,.tsv"
            onChange={onFileChange}
            className="hidden"
          />

          {file ? (
            <div>
              <div style={{
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                width: '56px', height: '56px', borderRadius: '16px',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '24px',
                margin: '0 auto 16px',
              }}>
                ✅
              </div>
              <p style={{ color: '#E5E7EB' }} className="font-semibold text-lg mb-1">
                {file.name}
              </p>
              <p style={{ color: '#6B7280' }} className="text-sm">
                {formatSize(file.size)}
                {parsed?.totalRows ? ` · ${parsed.totalRows} rows · ${parsed.headers.length} columns` : ''}
              </p>
              <p style={{ color: '#4B5563' }} className="text-xs mt-2">
                Click to choose a different file
              </p>
            </div>
          ) : (
            <div>
              <div style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))',
                border: '1px solid rgba(99,102,241,0.2)',
                width: '56px', height: '56px', borderRadius: '16px',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '24px',
                margin: '0 auto 16px',
              }}>
                📂
              </div>
              <p style={{ color: '#E5E7EB' }} className="font-semibold text-lg mb-1">
                Drop your file here
              </p>
              <p style={{ color: '#6B7280' }} className="text-sm mb-3">
                or click to browse files
              </p>
              <span style={{
                backgroundColor: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                color: '#A5B4FC',
                fontSize: '12px',
                padding: '4px 12px',
                borderRadius: '20px',
              }}>
                CSV · Excel · JSON · Parquet · TSV — up to 50MB
              </span>
            </div>
          )}
        </div>

        {/* Cached result message */}
        {cachedMsg && (
          <div style={{
            backgroundColor: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#A5B4FC',
          }} className="px-4 py-3 rounded-lg mb-6 text-sm">
            ⚡ {cachedMsg} Redirecting to results...
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#FCA5A5',
          }} className="px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Non-CSV notice */}
        {isNonCSV && (
          <div style={{
            backgroundColor: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            color: '#FCD34D',
          }} className="px-4 py-3 rounded-lg mb-6 text-sm">
            ℹ️ Preview not available for {file?.name.split('.').pop()?.toUpperCase()} files.
            The server will parse the file. Make sure to enter the correct target column name below.
          </div>
        )}

        {/* Preview + target selector */}
        {file && (
          <div className="space-y-6 animate-fade-in">

            {/* CSV Preview Table — only for CSV */}
            {!isNonCSV && parsed && parsed.headers[0] !== 'Preview not available for this format' && (
              <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
                className="rounded-xl overflow-hidden">
                <div style={{ borderBottom: '1px solid #1F2937' }}
                  className="px-5 py-3.5 flex items-center justify-between">
                  <h2 style={{ color: '#E5E7EB' }} className="text-sm font-semibold">
                    Preview
                  </h2>
                  <span style={{ color: '#4B5563' }} className="text-xs font-mono">
                    showing 5 of {parsed.totalRows} rows
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#0D1117', borderBottom: '1px solid #1F2937' }}>
                        {parsed.headers.map((h, i) => (
                          <th
                            key={i}
                            style={{
                              color: h === targetColumn ? '#A5B4FC' : '#6B7280',
                              borderRight: '1px solid #1F2937',
                              padding: '10px 16px',
                              textAlign: 'left',
                              fontSize: '11px',
                              fontFamily: 'JetBrains Mono, monospace',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {h}
                            {h === targetColumn && (
                              <span style={{
                                backgroundColor: 'rgba(99,102,241,0.2)',
                                color: '#A5B4FC',
                                border: '1px solid rgba(99,102,241,0.3)',
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '20px',
                                marginLeft: '8px',
                              }}>target</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.map((row, i) => (
                        <tr key={i} style={{
                          borderBottom: i < parsed.rows.length - 1 ? '1px solid #1F2937' : 'none'
                        }}>
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              style={{
                                color: parsed.headers[j] === targetColumn ? '#C7D2FE' : '#9CA3AF',
                                borderRight: '1px solid #1F2937',
                                padding: '10px 16px',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '11px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Target column selector — CSV gets buttons, non-CSV gets text input */}
            <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
              className="rounded-xl p-5">
              <h2 style={{ color: '#E5E7EB' }} className="text-sm font-semibold mb-1">
                Target column
              </h2>
              <p style={{ color: '#6B7280' }} className="text-xs mb-4">
                Which column do you want the model to predict?
              </p>

              {!isNonCSV && parsed ? (
                <div className="flex flex-wrap gap-2">
                  {parsed.headers.map((col) => (
                    <button
                      key={col}
                      onClick={() => setTarget(col)}
                      style={targetColumn === col ? {
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))',
                        border: '1px solid rgba(99,102,241,0.5)',
                        color: '#A5B4FC',
                      } : {
                        backgroundColor: '#0D1117',
                        border: '1px solid #1F2937',
                        color: '#6B7280',
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all hover:border-indigo-500"
                    >
                      {col}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={targetColumn}
                  onChange={e => setTarget(e.target.value)}
                  placeholder="Enter exact column name to predict..."
                  style={{
                    backgroundColor: '#0D1117',
                    border: '1px solid #1F2937',
                    color: '#E5E7EB',
                  }}
                  className="w-full rounded-lg px-4 py-2.5 text-sm font-mono outline-none"
                />
              )}
            </div>

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={uploading || !targetColumn}
              style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
              className="w-full text-white font-semibold py-3 rounded-xl transition-all glow-hover disabled:opacity-50 text-sm"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span>
                  Uploading and queuing training job...
                </span>
              ) : (
                '🚀 Upload and Start Training'
              )}
            </button>

          </div>
        )}
      </div>
    </DashboardLayout>
  )
}