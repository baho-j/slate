import { apiClient, setAuthToken } from '@/lib/api-client'
import type { LoginCredentials, User } from './types'

interface UserResponse {
  data: User
}

interface LoginResponse {
  data: User
  token: string
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<UserResponse>('/auth/me')
  return data.data
}

export async function login(credentials: LoginCredentials): Promise<User> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials)
  setAuthToken(data.token)
  return data.data
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout')
  } finally {
    setAuthToken(null)
  }
}
