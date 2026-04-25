import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.post('/auth/login', { email, password })
      login(response.data.access_token, response.data.refresh_token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#0B0F17' }} className="min-h-screen flex">

      {/* Left panel */}
      <div style={{ backgroundColor: '#0D1117', borderRight: '1px solid #1F2937' }}
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
            className="w-8 h-8 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span style={{ color: '#E5E7EB' }} className="font-semibold text-base">MLFoundry</span>
        </div>

        {/* Hero text */}
        <div>
          <div style={{ color: '#6B7280' }} className="text-xs font-mono uppercase tracking-widest mb-4">
            AutoML Platform v1.0
          </div>
          <h1 style={{ color: '#E5E7EB' }} className="text-4xl font-semibold leading-snug mb-4">
            Upload data.<br />
            Get a model.<br />
            <span className="gradient-text">Ship in minutes.</span>
          </h1>
          <p style={{ color: '#9CA3AF' }} className="text-base leading-relaxed">
            AI agents handle the entire ML pipeline.<br />
            No expertise required.
          </p>
        </div>

        {/* Feature pills */}
        <div className="space-y-3">
          {[
            { icon: '⚡', text: 'AI agents clean and prepare your data' },
            { icon: '🧠', text: 'Trains 10+ algorithms, picks the best' },
            { icon: '🚀', text: 'Deploy as REST API in one click' },
          ].map((f, i) => (
            <div key={i} style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl">
              <span className="text-lg">{f.icon}</span>
              <span style={{ color: '#9CA3AF' }} className="text-sm">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
              className="w-8 h-8 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span style={{ color: '#E5E7EB' }} className="font-semibold">MLFoundry</span>
          </div>

          <h2 style={{ color: '#E5E7EB' }} className="text-2xl font-semibold mb-1">
            Welcome back
          </h2>
          <p style={{ color: '#6B7280' }} className="text-sm mb-8">
            Sign in to your MLFoundry account
          </p>

          {error && (
            <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}
              className="px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color: '#9CA3AF' }} className="text-xs font-medium block mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #1F2937',
                  color: '#E5E7EB',
                }}
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition placeholder-gray-600 focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label style={{ color: '#9CA3AF' }} className="text-xs font-medium uppercase tracking-wide">
                  Password
                </label>
                <span style={{ color: '#6366F1' }} className="text-xs cursor-pointer hover:underline">
                  Forgot password?
                </span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #1F2937',
                  color: '#E5E7EB',
                }}
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition placeholder-gray-600 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
              className="w-full text-white font-semibold py-2.5 rounded-lg transition text-sm glow-hover disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p style={{ color: '#6B7280' }} className="text-center mt-6 text-sm">
            No account?{' '}
            <Link to="/register" style={{ color: '#6366F1' }} className="font-medium hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}