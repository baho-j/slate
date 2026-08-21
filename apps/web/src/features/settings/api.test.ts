import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api-client'
import { uploadLogo } from './api'

vi.mock('@/lib/api-client', () => ({
  apiClient: { post: vi.fn() },
}))

vi.mock('axios', () => ({
  default: { request: vi.fn() },
}))

describe('uploadLogo', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset()
    vi.mocked(axios.request).mockReset()
  })

  it('presigns, PUTs the file, and returns the stored key', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        key: 'logo-abc.png',
        url: 'https://blob.example/logos/logo-abc.png?sig=x',
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
      },
    })
    vi.mocked(axios.request).mockResolvedValue({})

    const file = new File(['x'], 'brand.png', { type: 'image/png' })
    const key = await uploadLogo(file)

    expect(apiClient.post).toHaveBeenCalledWith('/uploads/logo', {
      filename: 'brand.png',
      content_type: 'image/png',
      size: file.size,
    })
    expect(axios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://blob.example/logos/logo-abc.png?sig=x',
        method: 'PUT',
        data: file,
      }),
    )
    expect(key).toBe('logo-abc.png')
  })
})
