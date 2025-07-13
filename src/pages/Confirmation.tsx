import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { confirmSignup, resendConfirmationCode } from '../redux/slices/authSlice'
import type { RootState, AppDispatch } from '../redux/store'
import Logo from '../components/Logo'

const Confirmation = () => {
  const [formData, setFormData] = useState({
    confirmationCode: '',
  })
  const [resending, setResending] = useState(false)

  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { loading, error, confirmationEmail } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (!confirmationEmail) {
      navigate('/auth#register')
    }
  }, [confirmationEmail, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (confirmationEmail) {
      dispatch(confirmSignup({
        email: confirmationEmail,
        confirmationCode: formData.confirmationCode,
      }))
    }
  }

  const handleResendCode = async () => {
    if (confirmationEmail) {
      setResending(true)
      try {
        await dispatch(resendConfirmationCode(confirmationEmail))
      } finally {
        setResending(false)
      }
    }
  }

  const handleBackToSignup = () => {
    navigate('/auth#register')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <div className="text-white">
          <Logo size="xl" className="h-48 w-48 sm:h-64 sm:w-64 md:h-96 md:w-96" />
        </div>
      </div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse delay-500"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-300 rounded-full animate-pulse delay-1500"></div>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full border border-white/20 relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg">
              <Logo size="lg" animated={true} />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">Verify Your Email</h1>
          <p className="text-gray-300 text-sm sm:text-base lg:text-lg">Enter the confirmation code sent to your email</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-400 text-red-200 px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-red-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Email Display */}
          {confirmationEmail && (
            <div className="bg-blue-500/20 border border-blue-400 text-blue-200 px-4 sm:px-6 py-3 sm:py-4 rounded-xl">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300" />
                <span className="text-sm sm:text-base">{confirmationEmail}</span>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="confirmationCode" className="block text-xs sm:text-sm font-semibold text-gray-200 mb-2 sm:mb-3">
              Confirmation Code
            </label>
            <input
              type="text"
              id="confirmationCode"
              name="confirmationCode"
              value={formData.confirmationCode}
              onChange={(e) => setFormData({ ...formData, confirmationCode: e.target.value })}
              required
              className="w-full px-4 py-3 sm:py-4 border-2 border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 text-sm sm:text-base text-center tracking-widest"
              placeholder="Enter 6-digit code"
              maxLength={6}
              pattern="[0-9]{6}"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 sm:py-4 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base lg:text-lg min-h-[44px] sm:min-h-[48px]"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                <span className="text-sm sm:text-base">Verifying...</span>
              </div>
            ) : (
              'Verify Email'
            )}
          </button>
        </form>

        <div className="mt-6 sm:mt-8 space-y-4">
          <button
            onClick={handleResendCode}
            disabled={resending}
            className="w-full flex items-center justify-center space-x-2 text-blue-400 hover:text-blue-300 font-medium transition-colors py-2 px-4 rounded-lg hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Resending...</span>
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                <span className="text-sm sm:text-base">Resend Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleBackToSignup}
            className="w-full flex items-center justify-center space-x-2 text-gray-400 hover:text-gray-300 font-medium transition-colors py-2 px-4 rounded-lg hover:bg-gray-500/10"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm sm:text-base">Back to Sign Up</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Confirmation 