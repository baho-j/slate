export type UserRole = 'super_admin' | 'hr_manager' | 'recruiter' | 'interviewer' | 'candidate'

export interface Organization {
  id: number
  name: string
  slug: string
}

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  organization_id: number | null
  organization?: Organization
}

export interface LoginCredentials {
  email: string
  password: string
}
