import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/register', { email, password })
      navigate('/login')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#0B0F17' }} className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">

        <div className="flex items-center gap-2.5 mb-10">
          <div style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
            className="w-8 h-8 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span style={{ color: '#E5E7EB' }} className="font-semibold">MLFoundry</span>
        </div>

        <h2 style={{ color: '#E5E7EB' }} className="text-2xl font-semibold mb-1">
          Create your account
        </h2>
        <p style={{ color: '#6B7280' }} className="text-sm mb-8">
          Free forever. No credit card needed.
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
              style={{ backgroundColor: '#111827', border: '1px solid #1F2937', color: '#E5E7EB' }}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition placeholder-gray-600 focus:border-indigo-500"
            />
          </div>

          <div>
            <label style={{ color: '#9CA3AF' }} className="text-xs font-medium block mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={{ backgroundColor: '#111827', border: '1px solid #1F2937', color: '#E5E7EB' }}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition placeholder-gray-600 focus:border-indigo-500"
            />
            <p style={{ color: '#6B7280' }} className="text-xs mt-1.5">Minimum 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
            className="w-full text-white font-semibold py-2.5 rounded-lg transition text-sm glow-hover disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ color: '#6B7280' }} className="text-center mt-6 text-sm">
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#6366F1' }} className="font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}