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

const API_BASE_URL = getApiBaseUrl()

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

// Function to get temporary token for Speechmatics real-time transcription
export const getTemporaryToken = async () => {
  try {
    const SPEECHMATICS_API_KEY = import.meta.env.VITE_SPEECHMATICS_API_KEY
    
    // Debug logging
    console.log('Environment check:', {
      isProd: import.meta.env.PROD,
      hasApiKey: !!SPEECHMATICS_API_KEY,
      apiKeyLength: SPEECHMATICS_API_KEY?.length || 0,
      apiKeyPrefix: SPEECHMATICS_API_KEY?.substring(0, 4) || 'none'
    })
    
    if (!SPEECHMATICS_API_KEY) {
      throw new Error('Speechmatics API key not configured')
    }

    // Call Speechmatics temporary token API as per documentation
    console.log('Making request to Speechmatics API...')
    const response = await fetch('https://mp.speechmatics.com/v1/api_keys?type=rt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`
      },
      body: JSON.stringify({
        ttl: 60 // 60 seconds TTL as recommended
      })
    })
    
    console.log('Speechmatics API response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Speechmatics API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      })
      throw new Error(`Failed to get temporary token: ${errorData.message || response.statusText}`)
    }

    const data = await response.json()
    return data.key_value // Return the temporary token

  } catch (error: any) {
    console.error('Failed to get temporary token:', error)
    throw new Error('Failed to get temporary token: ' + error.message)
  }
}

export default api 