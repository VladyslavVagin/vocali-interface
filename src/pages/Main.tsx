import { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { LogOut, Heart, User, Mail, Loader2 } from 'lucide-react'
import { logout, getProfile } from '../redux/slices/authSlice'
import type { RootState, AppDispatch } from '../redux/store'
import Logo from '../components/Logo'

const Main = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { user, isAuthenticated, token, loading } = useSelector((state: RootState) => state.auth)
  const hasFetchedProfile = useRef(false)

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
        <div className="flex justify-center">
          {/* Favorites Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow max-w-md">
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