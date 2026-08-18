import axios from 'axios'
import { apiClient } from '@/lib/api-client'
import type {
  CreateUserInput,
  ManagedUser,
  Organization,
  OrgProfileInput,
  UpdateUserInput,
} from './types'

interface UploadTarget {
  key: string
  url: string
  method: string
  headers: Record<string, string>
}

export async function fetchOrganization(): Promise<Organization> {
  const { data } = await apiClient.get<{ data: Organization }>('/organizations/current')
  return data.data
}

export async function updateOrganization(input: OrgProfileInput): Promise<Organization> {
  const { data } = await apiClient.patch<{ data: Organization }>('/organizations/current', input)
  return data.data
}

export async function uploadLogo(file: File): Promise<string> {
  const { data: target } = await apiClient.post<UploadTarget>('/uploads/logo', {
    filename: file.name,
    content_type: file.type,
    size: file.size,
  })

  await axios.request({
    url: target.url,
    method: target.method,
    data: file,
    headers: target.headers,
  })

  return target.key
}

export async function fetchUsers(): Promise<ManagedUser[]> {
  const { data } = await apiClient.get<{ data: ManagedUser[] }>('/users')
  return data.data
}

export async function createUser(input: CreateUserInput): Promise<ManagedUser> {
  const { data } = await apiClient.post<{ data: ManagedUser }>('/users', input)
  return data.data
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<ManagedUser> {
  const { data } = await apiClient.patch<{ data: ManagedUser }>(`/users/${id}`, input)
  return data.data
}

export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/users/${id}`)
}
