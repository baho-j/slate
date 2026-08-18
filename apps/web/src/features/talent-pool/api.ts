import type { CursorPaginated } from '@/features/applications/types'
import { apiClient } from '@/lib/api-client'
import type { AddToPoolInput, TalentPoolEntry, TalentPoolListParams } from './types'

export async function fetchTalentPool(
  params: TalentPoolListParams,
): Promise<CursorPaginated<TalentPoolEntry>> {
  const { data } = await apiClient.get<CursorPaginated<TalentPoolEntry>>('/talent-pool', { params })
  return data
}

export async function addToPool(input: AddToPoolInput): Promise<TalentPoolEntry> {
  const { data } = await apiClient.post<{ data: TalentPoolEntry }>('/talent-pool', input)
  return data.data
}

export async function removeFromPool(entryId: string): Promise<void> {
  await apiClient.delete(`/talent-pool/${entryId}`)
}
