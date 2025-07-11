import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import api from '../../services/api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  name?: string // For backward compatibility
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  needsConfirmation: boolean
  confirmationEmail: string | null
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
  needsConfirmation: false,
  confirmationEmail: null,
}

// Async thunks
export const signin = createAsyncThunk(
  'auth/signin',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/signin', credentials)
      const { token, user } = response.data
      localStorage.setItem('token', token)
      return { token, user }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Sign in failed')
    }
  }
)

export const signup = createAsyncThunk(
  'auth/signup',
  async (userData: { email: string; password: string; firstName: string; lastName: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/signup', userData)
      return { email: userData.email }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Sign up failed')
    }
  }
)

export const confirmSignup = createAsyncThunk(
  'auth/confirmSignup',
  async (data: { email: string; confirmationCode: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/confirm-signup', data)
      const { token, user } = response.data
      localStorage.setItem('token', token)
      return { token, user }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Confirmation failed')
    }
  }
)

export const resendConfirmationCode = createAsyncThunk(
  'auth/resendConfirmationCode',
  async (email: string, { rejectWithValue }) => {
    try {
      await api.post('/auth/resend-confirmation-code', { email })
      return { email }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to resend code')
    }
  }
)

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      await api.post('/auth/forgot-password', { email })
      return { email }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send reset code')
    }
  }
)

export const confirmForgotPassword = createAsyncThunk(
  'auth/confirmForgotPassword',
  async (data: { email: string; confirmationCode: string; newPassword: string }, { rejectWithValue }) => {
    try {
      await api.post('/auth/confirm-forgot-password', data)
      return { success: true }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Password reset failed')
    }
  }
)

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout')
    localStorage.removeItem('token')
    return { success: true }
  } catch (error: any) {
    localStorage.removeItem('token')
    return { success: true }
  }
})

export const getProfile = createAsyncThunk(
  'auth/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me')
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get profile')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearConfirmation: (state) => {
      state.needsConfirmation = false
      state.confirmationEmail = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Signin
      .addCase(signin.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(signin.fulfilled, (state, action: PayloadAction<{ token: string; user: User }>) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.token = action.payload.token
        state.needsConfirmation = false
      })
      .addCase(signin.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Signup
      .addCase(signup.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(signup.fulfilled, (state, action: PayloadAction<{ email: string }>) => {
        state.loading = false
        state.needsConfirmation = true
        state.confirmationEmail = action.payload.email
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Confirm Signup
      .addCase(confirmSignup.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(confirmSignup.fulfilled, (state, action: PayloadAction<{ token: string; user: User }>) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.token = action.payload.token
        state.needsConfirmation = false
        state.confirmationEmail = null
      })
      .addCase(confirmSignup.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Resend Confirmation Code
      .addCase(resendConfirmationCode.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(resendConfirmationCode.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(resendConfirmationCode.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Forgot Password
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Confirm Forgot Password
      .addCase(confirmForgotPassword.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(confirmForgotPassword.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(confirmForgotPassword.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.needsConfirmation = false
        state.confirmationEmail = null
      })
      // Get Profile
      .addCase(getProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(getProfile.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false
        state.user = action.payload
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError, clearConfirmation } = authSlice.actions
export default authSlice.reducer 