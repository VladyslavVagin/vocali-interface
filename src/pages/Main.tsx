import { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { LogOut, Heart, User, Mail, Loader2, Upload, AlertCircle } from 'lucide-react'
import { logout, getProfile } from '../redux/slices/authSlice'
import type { RootState, AppDispatch } from '../redux/store'
import Logo from '../components/Logo'
import api from '../services/api'

const Main = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { user, isAuthenticated, token, loading } = useSelector((state: RootState) => state.auth)
  const hasFetchedProfile = useRef(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Only fetch profile if we have a valid token but no user data and haven't fetched yet
    if (token && token !== 'undefined' && token !== 'null' && isAuthenticated && !user && !hasFetchedProfile.current) {
      hasFetchedProfile.current = true
      dispatch(getProfile())
    }
  }, [token, isAuthenticated, dispatch])

  useEffect(() => {
    // If not authenticated or token is invalid, redirect to login
    if (!isAuthenticated || !token || token === 'undefined' || token === 'null') {
      hasFetchedProfile.current = false
      navigate('/auth#login')
    }
  }, [isAuthenticated, token, navigate])

  const handleLogout = () => {
    hasFetchedProfile.current = false
    dispatch(logout())
    navigate('/auth#login')
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (20MB = 20 * 1024 * 1024 bytes)
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError('File size exceeds 20MB limit')
      return
    }

    // Check file type
    if (!file.type.startsWith('audio/')) {
      setUploadError('Please select an audio file')
      return
    }

    setUploadError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file) // Changed from 'audio' to 'file'

      // Log file details for debugging
      console.log('Uploading file:', {
        name: file.name,
        size: file.size,
        type: file.type
      })

      const response = await api.post('/audio/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Handle successful upload
      const uploadResult = response.data
      
      // Store upload result - you can extend this to save to Redux state
      // For now, we'll just log the successful upload
      // In the future, you might want to:
      // - Save to Redux state for audio processing
      // - Navigate to audio analysis page
      // - Show success notification
      
      // Example: You could dispatch an action to save the upload result
      // dispatch(saveAudioUpload(uploadResult))
      
    } catch (error: any) {
      console.error('Upload error:', error.response?.data || error.message)
      setUploadError(
        error.response?.data?.message || 
        error.response?.data?.error || 
        error.message || 
        'Upload failed. Please try again.'
      )
    } finally {
      setUploading(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // Show loading while fetching profile (only if we're authenticated and have a token)
  if (loading && !user && isAuthenticated && token && token !== 'undefined' && token !== 'null') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show loading (will redirect in useEffect)
  if (!isAuthenticated || !token || token === 'undefined' || token === 'null') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Logo size="md" />
              <h1 className="text-2xl font-bold text-gray-800">Vocali</h1>
            </div>
            <div className="flex items-center space-x-6">
              {user && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{user.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center space-y-6">
          {/* Upload Audio Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow max-w-md w-full">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload Audio</h3>
            <p className="text-gray-600 mb-4">
              Upload your audio file for voice processing and analysis.
            </p>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {/* Upload button with tooltip */}
            <div className="relative group">
              <button 
                onClick={handleUploadClick}
                disabled={uploading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span>Upload Audio</span>
                  </>
                )}
              </button>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                <div className="flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>Maximum 20 MB audio files</span>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
            
            {/* Error message */}
            {uploadError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">{uploadError}</span>
                </div>
              </div>
            )}
          </div>

          {/* Favorites Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow max-w-md w-full">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <Heart className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Favorites</h3>
            <p className="text-gray-600 mb-4">
              Access your saved voice commands and favorite interactions.
            </p>
            <button 
              onClick={() => navigate('/favorites')}
              className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-200"
            >
              View Favorites
            </button>
          </div>
        </div>

        {/* Voice Status */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Voice Status</h2>
          <div className="flex items-center space-x-4">
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-600">Voice recognition is ready</span>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Main 