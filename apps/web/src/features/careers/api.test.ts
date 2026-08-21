import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api-client'
import { uploadCv } from './api'

vi.mock('@/lib/api-client', () => ({
  apiClient: { post: vi.fn() },
}))

vi.mock('axios', () => ({
  default: { request: vi.fn() },
}))

describe('uploadCv', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset()
    vi.mocked(axios.request).mockReset()
  })

  it('presigns, PUTs the bytes to the target, and returns the key', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        key: 'cv/abc.pdf',
        url: 'https://blob.example/cv/abc.pdf?sig=x',
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
      },
    })
    vi.mocked(axios.request).mockResolvedValue({})

    const file = new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' })
    const result = await uploadCv(file)

    expect(apiClient.post).toHaveBeenCalledWith('/public/uploads/cv', {
      filename: 'resume.pdf',
      content_type: 'application/pdf',
      size: file.size,
    })
    expect(axios.request).toHaveBeenCalledWith({
      url: 'https://blob.example/cv/abc.pdf?sig=x',
      method: 'PUT',
      data: file,
      headers: { 'Content-Type': 'application/pdf' },
    })
    expect(result).toEqual({ key: 'cv/abc.pdf', originalName: 'resume.pdf' })
  })
})
