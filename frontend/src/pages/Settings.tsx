import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Settings() {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSuccess, setPwSuccess]             = useState('')
  const [pwError, setPwError]                 = useState('')
  const [pwLoading, setPwLoading]             = useState(false)

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters')
      return
    }
    setPwLoading(true)
    setPwError('')
    setPwSuccess('')
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password:     newPassword,
      })
      setPwSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPwError(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-2xl animate-fade-in">

        <div className="mb-8">
          <h1 style={{ color: '#E5E7EB' }} className="text-2xl font-semibold mb-1">
            Settings
          </h1>
          <p style={{ color: '#6B7280' }} className="text-sm">
            Manage your account
          </p>
        </div>

        {/* Change Password */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
          className="rounded-xl p-6 mb-6">
          <h2 style={{ color: '#E5E7EB' }} className="text-sm font-semibold mb-1">
            Change Password
          </h2>
          <p style={{ color: '#4B5563' }} className="text-xs mb-5">
            Update your account password
          </p>

          <div className="space-y-3">
            {[
              { label: 'Current Password', value: currentPassword, setter: setCurrentPassword },
              { label: 'New Password',     value: newPassword,     setter: setNewPassword },
              { label: 'Confirm Password', value: confirmPassword, setter: setConfirmPassword },
            ].map((field, i) => (
              <div key={i}>
                <label style={{ color: '#9CA3AF' }} className="text-xs block mb-1">
                  {field.label}
                </label>
                <input
                  type="password"
                  value={field.value}
                  onChange={e => field.setter(e.target.value)}
                  style={{ backgroundColor: '#0D1117', border: '1px solid #1F2937', color: '#E5E7EB' }}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                />
              </div>
            ))}
          </div>

          {pwError && (
            <p style={{ color: '#FCA5A5' }} className="text-sm mt-3">{pwError}</p>
          )}
          {pwSuccess && (
            <p style={{ color: '#22C55E' }} className="text-sm mt-3">{pwSuccess}</p>
          )}

          <button
            onClick={handleChangePassword}
            disabled={pwLoading}
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
            className="mt-4 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50"
          >
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
        </div>

        {/* Danger Zone */}
        <div style={{
          backgroundColor: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)',
        }} className="rounded-xl p-6">
          <h2 style={{ color: '#EF4444' }} className="text-sm font-semibold mb-1">
            Danger Zone
          </h2>
          <p style={{ color: '#4B5563' }} className="text-xs mb-5">
            Irreversible actions — proceed with caution
          </p>

          <button
            onClick={handleLogout}
            style={{
              backgroundColor: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#FCA5A5',
            }}
            className="text-sm font-semibold px-6 py-2.5 rounded-lg transition-all"
          >
            Sign out of all devices
          </button>
        </div>

      </div>
    </DashboardLayout>
  )
}