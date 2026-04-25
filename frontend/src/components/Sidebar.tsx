import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { label: 'Dashboard',      path: '/dashboard',  icon: '▦' },
  { label: 'Upload dataset', path: '/upload',      icon: '↑' },
  { label: 'My models',      path: '/models',      icon: '◈' },
  { label: 'Datasets',       path: '/datasets',    icon: '◫' },
]

const bottomItems = [
  { label: 'APIs',           path: '/apis',        icon: '⚡' },
  { label: 'Marketplace',    path: '/marketplace', icon: '◎' },
  { label: 'Settings',       path: '/settings',    icon: '◌' },
]

export default function Sidebar() {
  const location = useLocation()
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside style={{ backgroundColor: '#0D1117', borderRight: '1px solid #1F2937', width: '220px' }}
      className="shrink-0 min-h-screen flex flex-col">

      {/* Logo */}
      <div style={{ borderBottom: '1px solid #1F2937' }} className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">M</span>
          </div>
          <span style={{ color: '#E5E7EB' }} className="font-semibold text-sm">MLFoundry</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p style={{ color: '#4B5563' }}
          className="text-xs font-medium px-2 mb-2 uppercase tracking-widest">
          Workspace
        </p>

        {navItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              style={active ? {
                background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))',
                border: '1px solid rgba(99,102,241,0.3)',
                color: '#A5B4FC',
              } : {
                color: '#6B7280',
                border: '1px solid transparent',
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 hover:text-gray-300"
            >
              <span className="font-mono text-xs w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        <div className="pt-4">
          <p style={{ color: '#4B5563' }}
            className="text-xs font-medium px-2 mb-2 uppercase tracking-widest">
            Other
          </p>
          {bottomItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                style={active ? {
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))',
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: '#A5B4FC',
                } : {
                  color: '#6B7280',
                  border: '1px solid transparent',
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 hover:text-gray-300"
              >
                <span className="font-mono text-xs w-4 text-center">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid #1F2937' }} className="px-3 py-4 space-y-2">
        {/* Plan meter */}
        <div style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
          className="px-3 py-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: '#A5B4FC' }} className="text-xs font-medium">Free plan</span>
            <span style={{ color: '#6B7280' }} className="text-xs font-mono">2 / 3</span>
          </div>
          <div style={{ backgroundColor: '#1F2937' }} className="w-full rounded-full h-1">
            <div
              style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', width: '66%' }}
              className="h-1 rounded-full"
            />
          </div>
          <p style={{ color: '#4B5563' }} className="text-xs mt-2">models used</p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{ color: '#6B7280' }}
          className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 hover:text-gray-400 transition-all"
        >
          <span className="text-xs">→</span> Logout
        </button>
      </div>
    </aside>
  )
}