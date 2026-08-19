export interface Organization {
  id: number
  name: string
  slug: string
  description: string | null
  website: string | null
  logo_url: string | null
}

export interface OrgProfileInput {
  name?: string
  description?: string | null
  website?: string | null
  logo_key?: string | null
}

export type ManagedRole = 'hr_manager' | 'recruiter' | 'interviewer' | 'candidate'

export interface ManagedUser {
  id: number
  name: string
  email: string
  role: string
  organization_id: number | null
}

export interface CreateUserInput {
  name: string
  email: string
  role: ManagedRole
}

export interface UpdateUserInput {
  name?: string
  email?: string
  role?: ManagedRole
}
