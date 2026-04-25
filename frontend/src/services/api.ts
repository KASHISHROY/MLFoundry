import axios from 'axios'

// This is the base URL of your backend
// Every request automatically starts with this
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// INTERCEPTOR — runs before EVERY request automatically
// Grabs the token from browser storage and attaches it
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// INTERCEPTOR — runs after EVERY response automatically
// If token expired (401) → try to refresh it silently
api.interceptors.response.use(
  (response) => response,  // success → just return it
  async (error) => {
    const original = error.config

    // 401 = unauthorized (token expired)
    // _retry flag stops infinite loops
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        const response = await axios.post(
          'http://localhost:8000/auth/refresh',
          { refresh_token: refreshToken }
        )

        // Save the new access token
        const newToken = response.data.access_token
        localStorage.setItem('access_token', newToken)

        // Retry the original failed request with new token
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)

      } catch {
        // Refresh token also expired → force logout
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api