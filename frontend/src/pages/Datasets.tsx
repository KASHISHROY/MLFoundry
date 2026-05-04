import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

interface Dataset {
  id:           number
  name:         string
  file_size:    number
  row_count:    number | null
  column_count: number | null
  target_column:string | null
  status:       string
  created_at:   string
}

function formatSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  if (days > 0)  return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'recently'
}

export default function Datasets() {
  const navigate = useNavigate()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    api.get('/datasets/')
      .then(r => setDatasets(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: number) {
    if (!confirm('Delete this dataset? This cannot be undone.')) return
    setDeleting(id)
    try {
      await api.delete(`/datasets/${id}`)
      setDatasets(prev => prev.filter(d => d.id !== id))
    } catch {
      alert('Failed to delete dataset')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-5xl animate-fade-in">

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 style={{ color: '#E5E7EB' }} className="text-2xl font-semibold mb-1">
              Datasets
            </h1>
            <p style={{ color: '#6B7280' }} className="text-sm">
              All uploaded datasets
            </p>
          </div>
          <button
            onClick={() => navigate('/upload')}
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
            className="text-white text-sm font-semibold px-5 py-2.5 rounded-lg glow-hover"
          >
            + Upload New
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3">
            <span className="animate-spin" style={{ color: '#6366F1' }}>⟳</span>
            <p style={{ color: '#6B7280' }}>Loading datasets...</p>
          </div>
        ) : datasets.length === 0 ? (
          <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
            className="rounded-2xl p-16 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 style={{ color: '#E5E7EB' }} className="text-lg font-semibold mb-2">
              No datasets yet
            </h3>
            <p style={{ color: '#6B7280' }} className="text-sm mb-6">
              Upload a CSV, Excel, or JSON file to get started
            </p>
            <button
              onClick={() => navigate('/upload')}
              style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
              className="text-white font-semibold px-6 py-3 rounded-xl text-sm glow-hover"
            >
              Upload Dataset
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
            className="rounded-xl overflow-hidden">
            <div style={{ borderBottom: '1px solid #1F2937' }}
              className="px-5 py-3 grid grid-cols-6 gap-4">
              {['Name', 'Size', 'Rows', 'Columns', 'Status', 'Actions'].map((h, i) => (
                <p key={i} style={{ color: '#4B5563' }}
                  className="text-xs font-medium uppercase tracking-wide">
                  {h}
                </p>
              ))}
            </div>
            {datasets.map((d, i) => (
              <div
                key={d.id}
                style={{ borderBottom: i < datasets.length - 1 ? '1px solid #1F2937' : 'none' }}
                className="px-5 py-4 grid grid-cols-6 gap-4 items-center hover:bg-white/[0.02] transition-all"
              >
                <div>
                  <p style={{ color: '#E5E7EB' }} className="text-sm font-mono">
                    {d.name.length > 20 ? d.name.slice(0, 20) + '...' : d.name}
                  </p>
                  <p style={{ color: '#4B5563' }} className="text-xs">{timeAgo(d.created_at)}</p>
                </div>
                <p style={{ color: '#9CA3AF' }} className="text-sm">
                  {formatSize(d.file_size)}
                </p>
                <p style={{ color: '#9CA3AF' }} className="text-sm">
                  {d.row_count?.toLocaleString() || '—'}
                </p>
                <p style={{ color: '#9CA3AF' }} className="text-sm">
                  {d.column_count || '—'}
                </p>
                <span style={{
                  backgroundColor: d.status === 'ready'
                    ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                  color: d.status === 'ready' ? '#22C55E' : '#F59E0B',
                  border: `1px solid ${d.status === 'ready'
                    ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                  display: 'inline-block',
                }}>
                  {d.status}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/upload')}
                    style={{ color: '#9CA3AF', border: '1px solid #1F2937' }}
                    className="text-xs px-2 py-1 rounded-lg hover:border-gray-600 transition-all"
                  >
                    Retrain
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={deleting === d.id}
                    style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                    className="text-xs px-2 py-1 rounded-lg hover:border-red-500 transition-all disabled:opacity-50"
                  >
                    {deleting === d.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}