export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  name?: string // For backward compatibility
}

export interface SigninCredentials {
  email: string
  password: string
}

export interface SignupData {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface ConfirmationData {
  email: string
  confirmationCode: string
}

export interface ForgotPasswordData {
  email: string
}

export interface ConfirmForgotPasswordData {
  email: string
  confirmationCode: string
  newPassword: string
}

export interface AuthResponse {
  token: string
  user: User
} 