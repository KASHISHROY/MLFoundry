import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import api from '../services/api'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦' },
  { label: 'Upload dataset', path: '/upload', icon: '↑' },
  { label: 'My models', path: '/models', icon: '◈' },
  { label: 'Datasets', path: '/datasets', icon: '◫' },
]

const bottomItems = [
  { label: 'APIs', path: '/apis', icon: '⚡' },
  { label: 'Marketplace', path: '/marketplace', icon: '◎' },
  { label: 'Settings', path: '/settings', icon: '◌' },
]

interface PlanInfo {
  is_pro: boolean
  job_count: number
  model_limit: number | null
  can_train: boolean
}

export default function Sidebar() {
  const location = useLocation()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()

  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)

  useEffect(() => {
    api.get('/payments/plan')
      .then(r => setPlanInfo(r.data))
      .catch(() => {})
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const usedModels = planInfo?.job_count ?? 0
  const modelLimit = planInfo?.model_limit ?? 3
  const isPro = planInfo?.is_pro ?? false

  const usagePct = isPro ? 0 : Math.min((usedModels / modelLimit) * 100, 100)
  const nearLimit = !isPro && usedModels >= modelLimit - 1
  const atLimit = !isPro && usedModels >= modelLimit

  return (
    <aside
      style={{
        backgroundColor: 'var(--surface-2)',
        borderRight: '1px solid var(--border)',
        width: '220px',
      }}
      className="shrink-0 min-h-screen flex flex-col"
    >
      {/* Logo */}
      <div
        style={{ borderBottom: '1px solid var(--border)' }}
        className="px-5 py-5"
      >
        <div className="flex items-center gap-2.5 w-full">
          <div
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          >
            <span className="text-white font-bold text-xs">M</span>
          </div>

          <span
            style={{ color: 'var(--text-1)' }}
            className="font-semibold text-sm"
          >
            MLFoundry
          </span>

          {isPro && (
            <span
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                color: 'white',
                fontSize: '8px',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '20px',
              }}
            >
              PRO
            </span>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              marginLeft: 'auto',
              backgroundColor: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: '#A5B4FC',
              fontSize: '12px',
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            title="Toggle light/dark mode"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p
          style={{ color: 'var(--text-4)' }}
          className="text-xs font-medium px-2 mb-2 uppercase tracking-widest"
        >
          Workspace
        </p>

        {navItems.map((item) => {
          const active = location.pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              style={
                active
                  ? {
                      background:
                        'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))',
                      border: '1px solid rgba(99,102,241,0.3)',
                      color: '#A5B4FC',
                    }
                  : {
                      color: 'var(--text-3)',
                      border: '1px solid transparent',
                    }
              }
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 hover:text-gray-300"
            >
              <span className="font-mono text-xs w-4 text-center">
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}

        <div className="pt-4">
          <p
            style={{ color: 'var(--text-4)' }}
            className="text-xs font-medium px-2 mb-2 uppercase tracking-widest"
          >
            Other
          </p>

          {bottomItems.map((item) => {
            const active = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                style={
                  active
                    ? {
                        background:
                          'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))',
                        border: '1px solid rgba(99,102,241,0.3)',
                        color: '#A5B4FC',
                      }
                    : {
                        color: 'var(--text-3)',
                        border: '1px solid transparent',
                      }
                }
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 hover:text-gray-300"
              >
                <span className="font-mono text-xs w-4 text-center">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div
        style={{ borderTop: '1px solid var(--border)' }}
        className="px-3 py-4 space-y-2"
      >
        {!isPro ? (
          <div
            style={{
              backgroundColor: atLimit
                ? 'rgba(239,68,68,0.08)'
                : 'rgba(99,102,241,0.08)',
              border: `1px solid ${
                atLimit
                  ? 'rgba(239,68,68,0.2)'
                  : 'rgba(99,102,241,0.2)'
              }`,
            }}
            className="px-3 py-3 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span
                style={{
                  color: atLimit ? '#FCA5A5' : '#A5B4FC',
                }}
                className="text-xs font-medium"
              >
                Free plan
              </span>

              <span
                style={{ color: 'var(--text-3)' }}
                className="text-xs font-mono"
              >
                {usedModels} / {modelLimit}
              </span>
            </div>

            <div
              style={{ backgroundColor: 'var(--border)' }}
              className="w-full rounded-full h-1"
            >
              <div
                style={{
                  background: atLimit
                    ? '#EF4444'
                    : nearLimit
                    ? '#F59E0B'
                    : 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  width: `${usagePct}%`,
                }}
                className="h-1 rounded-full"
              />
            </div>

            <p
              style={{ color: 'var(--text-4)' }}
              className="text-xs mt-2"
            >
              models used
            </p>

            <Link
              to="/upgrade"
              style={{
                display: 'block',
                marginTop: '8px',
                textAlign: 'center',
                background:
                  'linear-gradient(135deg, #3B82F6, #6366F1)',
                color: 'white',
                fontSize: '11px',
                fontWeight: '600',
                padding: '5px 0',
                borderRadius: '6px',
              }}
            >
              {atLimit
                ? '⚠️ Limit reached — Upgrade'
                : '⚡ Upgrade to Pro'}
            </Link>
          </div>
        ) : (
          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.1))',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
            className="px-3 py-2.5 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '14px' }}>✨</span>
              <div>
                <p
                  style={{ color: '#A5B4FC' }}
                  className="text-xs font-semibold"
                >
                  Pro Plan
                </p>
                <p
                  style={{ color: 'var(--text-4)' }}
                  className="text-xs"
                >
                  Unlimited models
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{ color: 'var(--text-3)' }}
          className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 hover:text-gray-400 transition-all"
        >
          <span className="text-xs">→</span> Logout
        </button>
      </div>
    </aside>
  )
}