import { apiClient, ensureCsrfCookie } from '@/lib/api-client'
import type { LoginCredentials, User } from './types'

interface UserResponse {
  data: User
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<UserResponse>('/auth/me')
  return data.data
}

export async function login(credentials: LoginCredentials): Promise<User> {
  await ensureCsrfCookie()
  const { data } = await apiClient.post<UserResponse>('/auth/login', credentials)
  return data.data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}
