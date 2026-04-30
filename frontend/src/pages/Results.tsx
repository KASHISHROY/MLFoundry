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
  best_params?:  Record<string, any>
}

interface FeatureImportance {
  feature:    string
  importance: number
}

interface ShapSummary {
  feature:       string
  mean_shap:     number
  sample_values: number[]
}

interface Results {
  problem_type:       string
  best_model:         string
  best_metrics:       Metrics
  all_models:         ModelResult[]
  feature_importance: FeatureImportance[]
  dataset_size:       number
  cleaning_report?:   Record<string, any>
  engineering_report?: Record<string, any>
  shap_summary: ShapSummary[]

}

// ── Helper: rate a metric value ─────────────────────────
function rateMetric(value: number, metricType: string): {
  label: string; color: string; explanation: string
} {
  if (metricType === 'accuracy' || metricType === 'f1_score' ||
      metricType === 'precision' || metricType === 'recall' ||
      metricType === 'r2_score') {
    if (value >= 0.95) return {
      label: 'Excellent',
      color: '#22C55E',
      explanation: 'Outstanding performance. Production-ready.'
    }
    if (value >= 0.90) return {
      label: 'Very Good',
      color: '#22C55E',
      explanation: 'Strong performance. Suitable for most use cases.'
    }
    if (value >= 0.80) return {
      label: 'Good',
      color: '#6366F1',
      explanation: 'Solid performance. Good for many applications.'
    }
    if (value >= 0.70) return {
      label: 'Fair',
      color: '#F59E0B',
      explanation: 'Acceptable but could be improved with more data.'
    }
    return {
      label: 'Needs Work',
      color: '#EF4444',
      explanation: 'Consider more data or feature engineering.'
    }
  }
  return { label: '', color: '#9CA3AF', explanation: '' }
}

function getMetricDescription(metric: string, value: number, problemType: string): string {
  const pct = (value * 100).toFixed(1)
  switch (metric) {
    case 'accuracy':
      return `The model correctly predicts ${pct}% of cases. Out of every 100 predictions, ${Math.round(value * 100)} will be correct.`
    case 'f1_score':
      return `F1 balances precision and recall. ${pct}% means the model handles both false positives and false negatives well.`
    case 'precision':
      return `When the model predicts a positive case, it's correct ${pct}% of the time. Low false alarm rate.`
    case 'recall':
      return `The model catches ${pct}% of all actual positive cases. It misses about ${(100 - parseFloat(pct)).toFixed(1)}%.`
    case 'r2_score':
      return `The model explains ${pct}% of the variance in your target variable. Higher is better.`
    case 'rmse':
      return `On average, predictions are off by ${value.toFixed(2)} units from actual values. Lower is better.`
    case 'mae':
      return `Mean absolute error of ${value.toFixed(2)}. The typical prediction error in your target's units.`
    default:
      return ''
  }
}

function getOverallVerdict(primaryScore: number, problemType: string): {
  title: string; color: string; bg: string; border: string; message: string
} {
  if (primaryScore >= 0.95) return {
    title: '🏆 Exceptional Model',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.3)',
    message: `This model achieves ${(primaryScore * 100).toFixed(1)}% — top-tier performance. It is production-ready and suitable for high-stakes decisions.`
  }
  if (primaryScore >= 0.90) return {
    title: '✅ Strong Model',
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.3)',
    message: `${(primaryScore * 100).toFixed(1)}% is strong performance. This model is production-ready for most business use cases.`
  }
  if (primaryScore >= 0.80) return {
    title: '👍 Good Model',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.3)',
    message: `${(primaryScore * 100).toFixed(1)}% is solid performance. Works well for most applications, may benefit from more training data.`
  }
  if (primaryScore >= 0.70) return {
    title: '⚠️ Fair Model',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.3)',
    message: `${(primaryScore * 100).toFixed(1)}% is acceptable but has room for improvement. Consider adding more data or features.`
  }
  return {
    title: '❌ Needs Improvement',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.3)',
    message: `${(primaryScore * 100).toFixed(1)}% suggests the model is struggling. Try adding more data, better features, or check if target column is correct.`
  }
}

export default function Results() {
  const { jobId }   = useParams()
  const navigate    = useNavigate()
  const [results, setResults] = useState<Results | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [expandedModel, setExpandedModel] = useState<number | null>(null)

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
  const primaryScore     = isClassification
    ? (results.best_metrics.accuracy ?? 0)
    : (results.best_metrics.r2_score ?? 0)
  const primaryLabel     = isClassification ? 'Accuracy' : 'R² Score'
  const maxImportance    = Math.max(
    ...results.feature_importance.map(f => f.importance)
  )
  const verdict          = getOverallVerdict(primaryScore, results.problem_type)

  // Build metrics list based on problem type
  const metricsList = isClassification
    ? [
        { key: 'accuracy',  label: 'Accuracy',  value: results.best_metrics.accuracy,  color: '#6366F1' },
        { key: 'f1_score',  label: 'F1 Score',  value: results.best_metrics.f1_score,  color: '#3B82F6' },
        { key: 'precision', label: 'Precision', value: results.best_metrics.precision, color: '#8B5CF6' },
        { key: 'recall',    label: 'Recall',    value: results.best_metrics.recall,    color: '#22C55E' },
      ]
    : [
        { key: 'r2_score', label: 'R² Score', value: results.best_metrics.r2_score, color: '#6366F1' },
        { key: 'rmse',     label: 'RMSE',     value: results.best_metrics.rmse,     color: '#EF4444' },
        { key: 'mae',      label: 'MAE',      value: results.best_metrics.mae,      color: '#F59E0B' },
      ]

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-6xl animate-fade-in">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ color: '#6B7280' }}
              className="text-sm hover:text-gray-400 transition-all mb-2 block"
            >
              ← Dashboard
            </button>
            <h1 style={{ color: '#E5E7EB' }} className="text-2xl font-semibold mb-1">
              Training Results
            </h1>
            <p style={{ color: '#6B7280' }} className="text-sm">
              Job #{jobId} · {results.problem_type} ·{' '}
              {results.dataset_size.toLocaleString()} rows ·{' '}
              {results.all_models.length} models trained
            </p>
          </div>

          <div style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
          }} className="px-4 py-2 rounded-xl flex items-center gap-2">
            <div style={{
              width: '8px', height: '8px',
              borderRadius: '50%', backgroundColor: '#22C55E'
            }} />
            <span style={{ color: '#22C55E' }} className="text-sm font-medium">
              Completed
            </span>
          </div>
        </div>

        {/* Overall verdict */}
        <div style={{
          backgroundColor: verdict.bg,
          border: `1px solid ${verdict.border}`,
        }} className="rounded-2xl p-5 mb-8">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 style={{ color: verdict.color }}
                className="text-lg font-semibold mb-1">
                {verdict.title}
              </h2>
              <p style={{ color: '#9CA3AF' }} className="text-sm leading-relaxed max-w-2xl">
                {verdict.message}
              </p>
            </div>
            <div className="text-right">
              <p style={{ color: '#6B7280' }}
                className="text-xs uppercase tracking-widest mb-1">
                {primaryLabel}
              </p>
              <p style={{ color: verdict.color, fontSize: '40px', fontWeight: '700', lineHeight: 1 }}
                className="font-mono">
                {(primaryScore * 100).toFixed(1)}%
              </p>
              <p style={{ color: verdict.color }}
                className="text-xs font-medium mt-1">
                {rateMetric(primaryScore, isClassification ? 'accuracy' : 'r2_score').label}
              </p>
            </div>
          </div>
        </div>

        {/* Best model info */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.08))',
          border: '1px solid rgba(99,102,241,0.2)',
        }} className="rounded-xl px-5 py-4 mb-6 flex items-center gap-4">
          <div style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))',
            border: '1px solid rgba(99,102,241,0.3)',
          }} className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0">
            🏆
          </div>
          <div>
            <p style={{ color: '#6B7280' }} className="text-xs mb-0.5">Best performing algorithm</p>
            <p style={{ color: '#E5E7EB' }} className="text-lg font-semibold">
              {results.best_model}
            </p>
          </div>
          {results.all_models[0]?.tuned && (
            <span style={{
              backgroundColor: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#A5B4FC',
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '20px',
            }}>
              hyperparameter tuned ✓
            </span>
          )}
        </div>

        {/* Metrics with explanations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metricsList.map((m) => {
            if (m.value === undefined || m.value === null) return null
            const rating = rateMetric(m.value, m.key)
            const desc   = getMetricDescription(m.key, m.value, results.problem_type)
            const isHigherBetter = !['rmse', 'mae'].includes(m.key)
            const displayVal = isHigherBetter
              ? `${(m.value * 100).toFixed(1)}%`
              : m.value.toFixed(4)

            return (
              <div
                key={m.key}
                style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
                className="rounded-xl p-4 hover:border-gray-600 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div style={{
                      width: '6px', height: '6px',
                      borderRadius: '50%', backgroundColor: m.color
                    }} />
                    <p style={{ color: '#6B7280' }} className="text-xs font-medium">
                      {m.label}
                    </p>
                  </div>
                  {rating.label && (
                    <span style={{ color: rating.color, fontSize: '10px', fontWeight: '500' }}>
                      {rating.label}
                    </span>
                  )}
                </div>
                <p style={{ color: '#E5E7EB' }}
                  className="text-2xl font-semibold font-mono mb-2">
                  {displayVal}
                </p>
                <p style={{ color: '#4B5563' }} className="text-xs leading-relaxed">
                  {desc}
                </p>
              </div>
            )
          })}
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
                What drives predictions the most
              </p>
            </div>
            <div className="p-5 space-y-4">
              {results.feature_importance.slice(0, 8).map((f, i) => {
                const pct       = (f.importance * 100).toFixed(1)
                const barWidth  = `${(f.importance / maxImportance) * 100}%`
                const barColor  = i === 0
                  ? 'linear-gradient(135deg, #3B82F6, #6366F1)'
                  : i === 1
                  ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                  : i === 2
                  ? '#374151'
                  : '#2D3748'

                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {i < 3 && (
                          <span style={{ color: '#F59E0B', fontSize: '10px' }}>
                            {i === 0 ? '①' : i === 1 ? '②' : '③'}
                          </span>
                        )}
                        <span style={{ color: '#9CA3AF' }} className="text-xs font-mono">
                          {f.feature}
                        </span>
                      </div>
                      <span style={{ color: '#6B7280' }} className="text-xs font-mono">
                        {pct}%
                      </span>
                    </div>
                    <div style={{ backgroundColor: '#1F2937' }}
                      className="w-full rounded-full h-1.5">
                      <div style={{
                        width: barWidth,
                        background: barColor,
                        transition: 'width 0.8s ease',
                      }} className="h-1.5 rounded-full" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Model Comparison */}
          <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
            className="rounded-xl overflow-hidden">
            <div style={{ borderBottom: '1px solid #1F2937' }} className="px-5 py-4">
              <h3 style={{ color: '#E5E7EB' }} className="text-sm font-semibold mb-0.5">
                All Models Ranked
              </h3>
              <p style={{ color: '#4B5563' }} className="text-xs">
                {results.all_models.length} algorithms compared
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: '#1F2937' }}>
              {results.all_models.map((m, i) => (
                <div key={i}>
                  <div
                    onClick={() => setExpandedModel(expandedModel === i ? null : i)}
                    className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span style={{
                        color: i === 0 ? '#F59E0B' : '#4B5563',
                        fontSize: '12px',
                        fontWeight: '600',
                        width: '24px',
                      }}>
                        {i === 0 ? '🏆' : `#${i + 1}`}
                      </span>
                      <div>
                        <p style={{ color: '#E5E7EB' }} className="text-sm font-medium">
                          {m.model_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {m.tuned && (
                            <span style={{
                              backgroundColor: 'rgba(99,102,241,0.1)',
                              color: '#A5B4FC',
                              border: '1px solid rgba(99,102,241,0.2)',
                              fontSize: '9px',
                              padding: '1px 5px',
                              borderRadius: '20px',
                            }}>tuned</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p style={{ color: i === 0 ? '#A5B4FC' : '#E5E7EB' }}
                          className="text-sm font-mono font-semibold">
                          {(m.primary_score * 100).toFixed(2)}%
                        </p>
                        <p style={{ color: '#4B5563' }} className="text-xs">
                          {isClassification ? 'accuracy' : 'R²'}
                        </p>
                      </div>
                      <span style={{ color: '#4B5563', fontSize: '10px' }}>
                        {expandedModel === i ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded metrics */}
                  {expandedModel === i && (
                    <div style={{ backgroundColor: '#0D1117', borderTop: '1px solid #1F2937' }}
                      className="px-5 py-3">
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(m.metrics).map(([key, val]) => (
                          <div key={key}>
                            <p style={{ color: '#4B5563' }} className="text-xs mb-0.5 capitalize">
                              {key.replace('_', ' ')}
                            </p>
                            <p style={{ color: '#9CA3AF' }} className="text-sm font-mono">
                              {typeof val === 'number'
                                ? !['rmse','mae'].includes(key)
                                  ? `${(val * 100).toFixed(2)}%`
                                  : val.toFixed(4)
                                : val
                              }
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* SHAP Section */}
{results.shap_summary && results.shap_summary.length > 0 && (
  <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
    className="rounded-xl overflow-hidden mb-8">
    <div style={{ borderBottom: '1px solid #1F2937' }} className="px-5 py-4">
      <h3 style={{ color: '#E5E7EB' }} className="text-sm font-semibold mb-0.5">
        SHAP Explainability
      </h3>
      <p style={{ color: '#4B5563' }} className="text-xs">
        <p style={{ color: '#4B5563' }} className="text-xs leading-relaxed">
  Feature importance above tells you WHAT matters. SHAP tells you HOW — 
  does this feature push predictions up (purple) or down (red)?
  A feature can be important but push in unexpected directions.
  Per-prediction SHAP (explaining individual cases) comes with model deployment.
</p>
      </p>
    </div>

    <div className="p-5">
      <div className="space-y-4">
        {results.shap_summary.slice(0, 8).map((s, i) => {
          const isPositive = s.mean_shap >= 0
          const absVal     = Math.abs(s.mean_shap)
          const maxShap    = Math.abs(results.shap_summary[0].mean_shap)
          const barWidth   = `${(absVal / maxShap) * 100}%`

          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span style={{
                    color: isPositive ? '#6366F1' : '#EF4444',
                    fontSize: '10px',
                    fontWeight: '700',
                    width: '12px',
                  }}>
                    {isPositive ? '+' : '−'}
                  </span>
                  <span style={{ color: '#9CA3AF' }} className="text-xs font-mono">
                    {s.feature}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{
                    color: isPositive ? '#A5B4FC' : '#FCA5A5',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    {isPositive ? '+' : ''}{s.mean_shap.toFixed(4)}
                  </span>
                  <span style={{
                    backgroundColor: isPositive
                      ? 'rgba(99,102,241,0.1)'
                      : 'rgba(239,68,68,0.1)',
                    color: isPositive ? '#A5B4FC' : '#FCA5A5',
                    border: `1px solid ${isPositive ? 'rgba(99,102,241,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    fontSize: '9px',
                    padding: '1px 6px',
                    borderRadius: '20px',
                  }}>
                    {isPositive ? '↑ increases' : '↓ decreases'}
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="flex items-center gap-2">
                <div style={{ width: '50%', display: 'flex', justifyContent: 'flex-end' }}>
                  {!isPositive && (
                    <div style={{
                      height: '6px',
                      width: barWidth,
                      background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                      borderRadius: '3px 0 0 3px',
                    }} />
                  )}
                </div>
                <div style={{
                  width: '1px', height: '12px',
                  backgroundColor: '#374151',
                }} />
                <div style={{ width: '50%' }}>
                  {isPositive && (
                    <div style={{
                      height: '6px',
                      width: barWidth,
                      background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                      borderRadius: '0 3px 3px 0',
                    }} />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-5 pt-4"
        style={{ borderTop: '1px solid #1F2937' }}>
        <div className="flex items-center gap-2">
          <div style={{
            width: '24px', height: '6px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            borderRadius: '3px',
          }} />
          <span style={{ color: '#6B7280' }} className="text-xs">
            Pushes prediction higher
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div style={{
            width: '24px', height: '6px',
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            borderRadius: '3px',
          }} />
          <span style={{ color: '#6B7280' }} className="text-xs">
            Pushes prediction lower
          </span>
        </div>
      </div>
    </div>
  </div>
)}

        {/* Plain English Explanation */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
          className="rounded-xl p-6 mb-6">
          <h3 style={{ color: '#E5E7EB' }} className="text-sm font-semibold mb-1">
            📖 Plain English Explanation
          </h3>
          <p style={{ color: '#4B5563' }} className="text-xs mb-5">
            What your results mean in simple terms
          </p>

          <div className="space-y-4">
            {/* What happened */}
            <div style={{ borderLeft: '2px solid #6366F1' }} className="pl-4">
              <p style={{ color: '#6B7280' }} className="text-xs font-medium uppercase tracking-wide mb-1">
                What happened
              </p>
              <p style={{ color: '#9CA3AF' }} className="text-sm leading-relaxed">
                Your <strong style={{ color: '#E5E7EB' }}>{results.dataset_size.toLocaleString()}-row</strong> dataset
                was processed through 5 AI agents — cleaning, feature engineering, training, tuning, and explanation.{' '}
                <strong style={{ color: '#E5E7EB' }}>{results.all_models.length} different algorithms</strong> competed,
                and <strong style={{ color: '#A5B4FC' }}>{results.best_model}</strong> won.
              </p>
            </div>

            {/* Is it good? */}
            <div style={{ borderLeft: `2px solid ${verdict.color}` }} className="pl-4">
              <p style={{ color: '#6B7280' }} className="text-xs font-medium uppercase tracking-wide mb-1">
                Is this result good?
              </p>
              <p style={{ color: '#9CA3AF' }} className="text-sm leading-relaxed">
                <strong style={{ color: verdict.color }}>{verdict.title.replace(/[🏆✅👍⚠️❌]/g, '').trim()}</strong> —{' '}
                {verdict.message}
              </p>
            </div>

            {/* What drives it */}
            {results.feature_importance.length > 0 && (
              <div style={{ borderLeft: '2px solid #F59E0B' }} className="pl-4">
                <p style={{ color: '#6B7280' }} className="text-xs font-medium uppercase tracking-wide mb-1">
                  What drives predictions
                </p>
                <p style={{ color: '#9CA3AF' }} className="text-sm leading-relaxed">
                  The single most important factor is{' '}
                  <strong style={{ color: '#E5E7EB' }}>
                    {results.feature_importance[0].feature}
                  </strong>{' '}
                  ({(results.feature_importance[0].importance * 100).toFixed(1)}% importance).
                  {results.feature_importance[1] && (
                    <> This is followed by{' '}
                      <strong style={{ color: '#E5E7EB' }}>
                        {results.feature_importance[1].feature}
                      </strong>{' '}
                      and{' '}
                      <strong style={{ color: '#E5E7EB' }}>
                        {results.feature_importance[2]?.feature}
                      </strong>.
                    </>
                  )}
                  {' '}Focus on these features if you want to improve accuracy further.
                </p>
              </div>
            )}

            {/* What to do next */}
            <div style={{ borderLeft: '2px solid #22C55E' }} className="pl-4">
              <p style={{ color: '#6B7280' }} className="text-xs font-medium uppercase tracking-wide mb-1">
                What to do next
              </p>
              <p style={{ color: '#9CA3AF' }} className="text-sm leading-relaxed">
                {primaryScore >= 0.85
                  ? 'Your model is ready to deploy. Click "Deploy as API" to get a live endpoint you can call from any application.'
                  : primaryScore >= 0.70
                  ? 'Your model is usable. To improve it, try collecting more data, adding new features, or removing irrelevant columns.'
                  : 'This model needs improvement before deployment. Consider: more training data, better feature selection, or check if your target column is correctly defined.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 flex-wrap">
          <button
  onClick={() => navigate(`/deploy/${jobId}`)}
  style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
  className="text-white font-semibold px-6 py-3 rounded-xl text-sm glow-hover transition-all"
>
  🚀 Deploy as API
</button>
          <button
            onClick={() => navigate(`/jobs/${jobId}`)}
            style={{ backgroundColor: '#111827', border: '1px solid #1F2937', color: '#9CA3AF' }}
            className="font-semibold px-6 py-3 rounded-xl text-sm hover:border-gray-600 hover:text-gray-300 transition-all"
          >
            View Training Logs
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