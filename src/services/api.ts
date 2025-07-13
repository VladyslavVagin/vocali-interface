import axios from 'axios'

// Get API base URL from environment variables
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl) {
    return envUrl
  }
  // Default fallback
  return import.meta.env.PROD 
    ? 'http://your-production-api.com' 
    : 'http://localhost:3000'
}

// In production, use the Vercel proxy to avoid mixed content issues
const getBaseURL = () => {
  if (import.meta.env.PROD) {
    // Use relative URL to trigger the Vercel proxy
    return '/api'
  }
  return getApiBaseUrl()
}

const API_BASE_URL = getBaseURL()

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      })
      
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/auth#login'
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('API Network Error:', {
        message: error.message,
        url: error.config?.url
      })
      
      // Show user-friendly error message
      error.response = {
        data: {
          message: 'Network error. Please check your internet connection and try again.'
        }
      }
    } else {
      // Something else happened
      console.error('API Error:', error.message)
      error.response = {
        data: {
          message: 'An unexpected error occurred. Please try again.'
        }
      }
    }
    
    return Promise.reject(error)
  }
)

export default api 