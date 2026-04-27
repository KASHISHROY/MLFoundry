import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'

const stats = [
  { label: 'Models trained',  value: '3',     sub: '+1 this week',     color: '#6366F1' },
  { label: 'Datasets',        value: '7',     sub: '2 processing',      color: '#3B82F6' },
  { label: 'API calls today', value: '1,240', sub: 'within limit',      color: '#8B5CF6' },
  { label: 'Avg accuracy',    value: '94.2%', sub: 'across all models', color: '#22C55E' },
]

const recentModels = [
  { name: 'house_prices',    accuracy: '94.2%', type: 'Regression',     date: 'Today',      status: 'success' },
  { name: 'churn_predictor', accuracy: '91.0%', type: 'Classification', date: 'Yesterday',  status: 'success' },
  { name: 'lead_scorer',     accuracy: '88.5%', type: 'Classification', date: '3 days ago', status: 'success' },
]

const statusColors: Record<string, string> = {
  success:  '#22C55E',
  training: '#3B82F6',
  failed:   '#EF4444',
}

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-6xl animate-fade-in">

        {/* Header */}
        <div className="mb-8">
          <h1 style={{ color: '#E5E7EB' }} className="text-2xl font-semibold mb-1">
            Good morning, Kashish 👋
          </h1>
          <p style={{ color: '#6B7280' }} className="text-sm">
            Here's what's happening with your models today.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <div
              key={i}
              style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
              className="rounded-xl px-5 py-4 hover:border-gray-600 transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: s.color }} />
                <p style={{ color: '#6B7280' }} className="text-xs font-medium">{s.label}</p>
              </div>
              <p style={{ color: '#E5E7EB' }} className="text-2xl font-semibold mb-0.5">{s.value}</p>
              <p style={{ color: '#4B5563' }} className="text-xs">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Content row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent models */}
          <div
            style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
            className="lg:col-span-2 rounded-xl overflow-hidden"
          >
            <div
              style={{ borderBottom: '1px solid #1F2937' }}
              className="px-5 py-4 flex items-center justify-between"
            >
              <h2 style={{ color: '#E5E7EB' }} className="text-sm font-semibold">Recent models</h2>
              <button style={{ color: '#6366F1' }} className="text-xs font-medium hover:underline">
                View all →
              </button>
            </div>

            <div>
              {recentModels.map((m, i) => (
                <div
                  key={i}
                  style={{ borderBottom: i < recentModels.length - 1 ? '1px solid #1F2937' : 'none' }}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        backgroundColor: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.2)',
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    >
                      ◈
                    </div>
                    <div>
                      <p style={{ color: '#E5E7EB' }} className="text-sm font-medium font-mono">
                        {m.name}
                      </p>
                      <p style={{ color: '#4B5563' }} className="text-xs">{m.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p style={{ color: '#E5E7EB' }} className="text-sm font-semibold">{m.accuracy}</p>
                      <p style={{ color: '#4B5563' }} className="text-xs">accuracy</p>
                    </div>
                    <div
                      style={{
                        color: statusColors[m.status],
                        backgroundColor: `${statusColors[m.status]}15`,
                        border: `1px solid ${statusColors[m.status]}30`,
                      }}
                      className="text-xs px-2 py-0.5 rounded-full hidden sm:block"
                    >
                      {m.status}
                    </div>
                    <p style={{ color: '#4B5563' }} className="text-xs hidden sm:block w-16 text-right">
                      {m.date}
                    </p>
                    <button
                      style={{ color: '#9CA3AF', border: '1px solid #1F2937' }}
                      className="text-xs px-3 py-1.5 rounded-lg hover:border-gray-600 hover:text-gray-300 transition-all"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick start */}
          <div
            style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
            className="rounded-xl flex flex-col overflow-hidden"
          >
            <div style={{ borderBottom: '1px solid #1F2937' }} className="px-5 py-4">
              <h2 style={{ color: '#E5E7EB' }} className="text-sm font-semibold">Quick start</h2>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
              >
                📂
              </div>
              <p style={{ color: '#E5E7EB' }} className="text-sm font-medium mb-1">
                Upload a dataset
              </p>
              <p style={{ color: '#6B7280' }} className="text-xs mb-6 leading-relaxed">
                Drop a CSV and let AI agents train your model automatically
              </p>
              <button
                onClick={() => navigate('/upload')}
                style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
                className="text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all glow-hover w-full"
              >
                Upload CSV
              </button>
              <button
                style={{ color: '#4B5563' }}
                className="text-xs mt-3 hover:text-gray-400 transition-all"
              >
                browse marketplace →
              </button>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}