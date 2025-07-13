import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL;
const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only auto-logout for 401 errors on non-profile endpoints
    if (error.response?.status === 401 && !error.config.url?.includes('/auth/me')) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      window.location.href = '/auth#login'
    }
    return Promise.reject(error)
  }
)

export default api 