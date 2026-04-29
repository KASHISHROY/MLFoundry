import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

interface Metrics {
  accuracy?:  number
  f1_score?:  number
  precision?: number
  recall?:    number
  r2_score?:  number
  rmse?:      number
  mae?:       number
}

interface ModelResult {
  model_name:    string
  metrics:       Metrics
  primary_score: number
  tuned:         boolean
}

interface FeatureImportance {
  feature:    string
  importance: number
}

interface Results {
  problem_type:       string
  best_model:         string
  best_metrics:       Metrics
  all_models:         ModelResult[]
  feature_importance: FeatureImportance[]
  dataset_size:       number
}

export default function Results() {
  const { jobId }    = useParams()
  const navigate     = useNavigate()
  const [results, setResults] = useState<Results | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!jobId) return
    api.get(`/datasets/jobs/${jobId}/results`)
      .then(r => setResults(r.data))
      .catch(() => setError('Failed to load results'))
      .finally(() => setLoading(false))
  }, [jobId])

  if (loading) return (
    <DashboardLayout>
      <div className="px-8 py-8 flex items-center gap-3">
        <span className="animate-spin text-xl" style={{ color: '#6366F1' }}>⟳</span>
        <p style={{ color: '#9CA3AF' }}>Loading results...</p>
      </div>
    </DashboardLayout>
  )

  if (error || !results) return (
    <DashboardLayout>
      <div className="px-8 py-8">
        <p style={{ color: '#EF4444' }}>{error || 'No results found'}</p>
      </div>
    </DashboardLayout>
  )

  const isClassification = results.problem_type === 'classification'
  const primaryMetric    = isClassification
    ? results.best_metrics.accuracy
    : results.best_metrics.r2_score
  const primaryLabel     = isClassification ? 'Accuracy' : 'R² Score'
  const maxImportance    = Math.max(...results.feature_importance.map(f => f.importance))

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-6xl animate-fade-in">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate('/dashboard')}
                style={{ color: '#6B7280' }}
                className="text-sm hover:text-gray-400 transition-all"
              >
                ← Dashboard
              </button>
            </div>
            <h1 style={{ color: '#E5E7EB' }} className="text-2xl font-semibold mb-1">
              Training Results
            </h1>
            <p style={{ color: '#6B7280' }} className="text-sm">
              Job #{jobId} · {results.problem_type} · {results.dataset_size.toLocaleString()} rows
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
            border: '1px solid rgba(34,197,94,0.3)',
          }} className="px-4 py-2 rounded-xl flex items-center gap-2">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
            <span style={{ color: '#22C55E' }} className="text-sm font-medium">Completed</span>
          </div>
        </div>

        {/* Best model hero card */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.1))',
            border: '1px solid rgba(99,102,241,0.3)',
          }}
          className="rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p style={{ color: '#6B7280' }} className="text-xs font-medium uppercase tracking-widest mb-1">
                Best Model
              </p>
              <h2 style={{ color: '#E5E7EB' }} className="text-3xl font-semibold mb-1">
                {results.best_model}
              </h2>
              <p style={{ color: '#9CA3AF' }} className="text-sm">
                {results.problem_type} · {results.dataset_size.toLocaleString()} training samples
              </p>
            </div>
            <div className="text-right">
              <p style={{ color: '#6B7280' }} className="text-xs uppercase tracking-widest mb-1">
                {primaryLabel}
              </p>
              <p
                style={{ color: '#A5B4FC', fontSize: '48px', fontWeight: '700', lineHeight: 1 }}
                className="font-mono"
              >
                {primaryMetric !== undefined
                  ? `${(primaryMetric * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Metrics cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isClassification ? (
            <>
              <MetricCard label="Accuracy"  value={results.best_metrics.accuracy}  color="#6366F1" isPercent />
              <MetricCard label="F1 Score"  value={results.best_metrics.f1_score}  color="#3B82F6" isPercent />
              <MetricCard label="Precision" value={results.best_metrics.precision} color="#8B5CF6" isPercent />
              <MetricCard label="Recall"    value={results.best_metrics.recall}    color="#22C55E" isPercent />
            </>
          ) : (
            <>
              <MetricCard label="R² Score" value={results.best_metrics.r2_score} color="#6366F1" isPercent />
              <MetricCard label="RMSE"     value={results.best_metrics.rmse}     color="#EF4444" isPercent={false} />
              <MetricCard label="MAE"      value={results.best_metrics.mae}      color="#F59E0B" isPercent={false} />
              <MetricCard label="Dataset"  value={results.dataset_size / 1000}   color="#22C55E" isPercent={false} suffix="k rows" />
            </>
          )}
        </div>

        {/* Main content row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Feature Importance */}
          <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
            className="rounded-xl overflow-hidden">
            <div style={{ borderBottom: '1px solid #1F2937' }} className="px-5 py-4">
              <h3 style={{ color: '#E5E7EB' }} className="text-sm font-semibold mb-0.5">
                Feature Importance
              </h3>
              <p style={{ color: '#4B5563' }} className="text-xs">
                Which features drive predictions the most
              </p>
            </div>
            <div className="p-5 space-y-3">
              {results.feature_importance.slice(0, 8).map((f, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ color: '#9CA3AF' }} className="text-xs font-mono">
                      {f.feature}
                    </span>
                    <span style={{ color: '#6B7280' }} className="text-xs font-mono">
                      {(f.importance * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ backgroundColor: '#1F2937' }} className="w-full rounded-full h-1.5">
                    <div
                      style={{
                        width: `${(f.importance / maxImportance) * 100}%`,
                        background: i === 0
                          ? 'linear-gradient(135deg, #3B82F6, #6366F1)'
                          : i === 1
                          ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                          : '#374151',
                        transition: 'width 0.8s ease',
                      }}
                      className="h-1.5 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Models Comparison */}
          <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
            className="rounded-xl overflow-hidden">
            <div style={{ borderBottom: '1px solid #1F2937' }} className="px-5 py-4">
              <h3 style={{ color: '#E5E7EB' }} className="text-sm font-semibold mb-0.5">
                Model Comparison
              </h3>
              <p style={{ color: '#4B5563' }} className="text-xs">
                All {results.all_models.length} models ranked by performance
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: '#1F2937' }}>
              {results.all_models.map((m, i) => (
                <div
                  key={i}
                  className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        color: i === 0 ? '#F59E0B' : '#4B5563',
                        fontSize: '13px',
                        fontWeight: '600',
                        width: '20px',
                      }}
                    >
                      {i === 0 ? '🏆' : `#${i + 1}`}
                    </span>
                    <div>
                      <p style={{ color: '#E5E7EB' }} className="text-sm font-medium">
                        {m.model_name}
                      </p>
                      {m.tuned && (
                        <span style={{
                          backgroundColor: 'rgba(99,102,241,0.15)',
                          color: '#A5B4FC',
                          border: '1px solid rgba(99,102,241,0.3)',
                          fontSize: '9px',
                          padding: '1px 6px',
                          borderRadius: '20px',
                        }}>
                          tuned
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p style={{ color: i === 0 ? '#A5B4FC' : '#E5E7EB' }}
                      className="text-sm font-mono font-semibold">
                      {(m.primary_score * 100).toFixed(2)}%
                    </p>
                    <p style={{ color: '#4B5563' }} className="text-xs">
                      {isClassification ? 'accuracy' : 'R²'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plain English Explanation */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
          className="rounded-xl p-6 mb-8">
          <h3 style={{ color: '#E5E7EB' }} className="text-sm font-semibold mb-1">
            📖 What This Means (Plain English)
          </h3>
          <p style={{ color: '#4B5563' }} className="text-xs mb-4">
            Auto-generated explanation of your results
          </p>
          <div style={{ color: '#9CA3AF' }} className="text-sm leading-relaxed space-y-2">
            <p>
              Your dataset was trained as a <strong style={{ color: '#E5E7EB' }}>{results.problem_type}</strong> problem
              with <strong style={{ color: '#E5E7EB' }}>{results.dataset_size.toLocaleString()}</strong> rows of data.
            </p>
            <p>
              After training <strong style={{ color: '#E5E7EB' }}>{results.all_models.length} different algorithms</strong>,
              the best performing model was <strong style={{ color: '#A5B4FC' }}>{results.best_model}</strong>{' '}
              with {primaryLabel.toLowerCase()} of{' '}
              <strong style={{ color: '#A5B4FC' }}>
                {primaryMetric !== undefined ? `${(primaryMetric * 100).toFixed(1)}%` : 'N/A'}
              </strong>.
            </p>
            {results.feature_importance.length > 0 && (
              <p>
                The most important factor for predictions is{' '}
                <strong style={{ color: '#E5E7EB' }}>
                  {results.feature_importance[0].feature}
                </strong>{' '}
                ({(results.feature_importance[0].importance * 100).toFixed(1)}% importance),
                followed by{' '}
                <strong style={{ color: '#E5E7EB' }}>
                  {results.feature_importance[1]?.feature}
                </strong>{' '}
                and{' '}
                <strong style={{ color: '#E5E7EB' }}>
                  {results.feature_importance[2]?.feature}
                </strong>.
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
            className="text-white font-semibold px-6 py-3 rounded-xl text-sm glow-hover"
          >
            🚀 Deploy as API
          </button>
          <button
            onClick={() => navigate('/upload')}
            style={{ backgroundColor: '#111827', border: '1px solid #1F2937', color: '#9CA3AF' }}
            className="font-semibold px-6 py-3 rounded-xl text-sm hover:border-gray-600 hover:text-gray-300 transition-all"
          >
            Upload New Dataset
          </button>
        </div>

      </div>
    </DashboardLayout>
  )
}

// ── Reusable metric card ───────────────────────────────────
function MetricCard({
  label, value, color, isPercent, suffix
}: {
  label: string
  value: number | undefined
  color: string
  isPercent: boolean
  suffix?: string
}) {
  const display = value === undefined
    ? 'N/A'
    : isPercent
    ? `${(value * 100).toFixed(1)}%`
    : suffix
    ? `${value.toFixed(1)}${suffix}`
    : value.toFixed(4)

  return (
    <div
      style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
      className="rounded-xl px-5 py-4 hover:border-gray-600 transition-all"
    >
      <div className="flex items-center gap-2 mb-3">
        <div style={{
          width: '6px', height: '6px',
          borderRadius: '50%', backgroundColor: color
        }} />
        <p style={{ color: '#6B7280' }} className="text-xs font-medium">{label}</p>
      </div>
      <p style={{ color: '#E5E7EB' }} className="text-2xl font-semibold font-mono">
        {display}
      </p>
    </div>
  )
}