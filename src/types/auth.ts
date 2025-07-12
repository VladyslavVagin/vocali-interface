export interface User {
  sub: string
  email: string
  name: string
  firstName: string
  lastName: string
  username: string
  emailVerified: boolean
  userStatus: string
  enabled: boolean
  tokenUse: string
  scope: string
  authTime: number
  issuedAt: number
  expiresAt: number
}

export interface SigninCredentials {
  email: string
  password: string
}

export interface SignupData extends SigninCredentials {
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