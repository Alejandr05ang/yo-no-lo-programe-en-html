import { ApiError } from './http.ts'

export type Role = 'student' | 'instructor' | 'admin'
export type OnboardingState = 'EMAIL_VERIFICATION_REQUIRED' | 'PROFILE_REQUIRED' | 'JOIN_CLASS_REQUIRED' | 'READY'

export interface BackendUser {
  id: string
  email: string
  full_name: string
  display_name: string
  description: string
  hobbies: string[]
  avatar_path: string | null
  github_url: string | null
  linkedin_url: string | null
  website_url: string | null
  role: Role
  email_verified: boolean
  profile_completed_at: string | null
  is_active: boolean
}

export interface BackendSession {
  user: BackendUser
  onboarding: { state: OnboardingState }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseSession(value: unknown): BackendSession {
  if (!object(value) || !object(value.user) || !object(value.onboarding)) throw new ApiError('INVALID_RESPONSE')
  const { user, onboarding } = value
  const strings = ['id', 'email', 'full_name', 'display_name', 'description']
  const hobbies = Array.isArray(user.hobbies) && user.hobbies.every((h) => typeof h === 'string')
  const optionalStrings = ['avatar_path', 'github_url', 'linkedin_url', 'website_url', 'profile_completed_at']
  if (!hobbies || strings.some((field) => typeof user[field] !== 'string') || optionalStrings.some((field) => user[field] !== null && typeof user[field] !== 'string') ||
    !['student', 'instructor', 'admin'].includes(String(user.role)) || typeof user.email_verified !== 'boolean' || user.is_active !== true ||
    !['EMAIL_VERIFICATION_REQUIRED', 'PROFILE_REQUIRED', 'JOIN_CLASS_REQUIRED', 'READY'].includes(String(onboarding.state))) {
    throw new ApiError('INVALID_RESPONSE')
  }
  return value as unknown as BackendSession
}
