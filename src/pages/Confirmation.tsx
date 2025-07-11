import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Mail, Loader2, Mic, ArrowLeft, RefreshCw } from 'lucide-react'
import { confirmSignup, resendConfirmationCode, clearError } from '../redux/slices/authSlice'
import type { RootState, AppDispatch } from '../redux/store'

const Confirmation = () => {
  const [confirmationCode, setConfirmationCode] = useState('')
  const [isResending, setIsResending] = useState(false)

  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { loading, error, isAuthenticated, confirmationEmail } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (confirmationEmail) {
      dispatch(confirmSignup({ email: confirmationEmail, confirmationCode }))
    }
  }

  const handleResendCode = async () => {
    if (confirmationEmail) {
      setIsResending(true)
      await dispatch(resendConfirmationCode(confirmationEmail))
      setIsResending(false)
    }
  }

  const handleBackToSignup = () => {
    navigate('/auth#register')
  }

  if (!confirmationEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Logo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <div className="text-white">
            <Mic className="h-96 w-96" />
          </div>
        </div>
        
        {/* Floating particles effect */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse delay-500"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-300 rounded-full animate-pulse delay-1500"></div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-md w-full border border-white/20 relative z-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Invalid Confirmation</h1>
            <p className="text-gray-300 mb-6">Please sign up first to receive a confirmation code.</p>
            <button
              onClick={handleBackToSignup}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
            >
              Go to Sign Up
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <div className="text-white">
          <Mic className="h-96 w-96" />
        </div>
      </div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse delay-500"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-300 rounded-full animate-pulse delay-1500"></div>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-md w-full border border-white/20 relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
              <Mic className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Verify Your Email</h1>
          <p className="text-gray-300 text-lg">Enter the code sent to your email</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-400 text-red-200 px-6 py-4 rounded-xl shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-500/20 border border-blue-400 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-blue-300" />
              <span className="text-sm text-blue-200">
                Code sent to <strong>{confirmationEmail}</strong>
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="confirmationCode" className="block text-sm font-semibold text-gray-200 mb-3">
              Confirmation Code
            </label>
            <div className="relative">
              <input
                type="text"
                id="confirmationCode"
                name="confirmationCode"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                required
                maxLength={6}
                className="w-full px-4 py-4 border-2 border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 bg-white/10 backdrop-blur-sm text-white text-center text-2xl font-mono tracking-widest placeholder-gray-400"
                placeholder="000000"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !confirmationCode}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin h-5 w-5 mr-3" />
                Verifying...
              </div>
            ) : (
              'Verify Email'
            )}
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          <button
            onClick={handleResendCode}
            disabled={isResending}
            className="flex items-center justify-center space-x-2 text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
            <span>{isResending ? 'Resending...' : 'Resend Code'}</span>
          </button>

          <div className="pt-4 border-t border-gray-600">
            <button
              onClick={handleBackToSignup}
              className="flex items-center space-x-2 text-gray-400 hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign Up</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Confirmation 