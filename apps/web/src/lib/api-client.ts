import axios from 'axios'
import { env } from '@/lib/env'

export const apiClient = axios.create({
  baseURL: env.VITE_API_URL,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    Accept: 'application/json',
  },
})

let csrfReady = false

export async function ensureCsrfCookie(): Promise<void> {
  if (csrfReady) {
    return
  }

  await apiClient.get('/sanctum/csrf-cookie', { baseURL: new URL(env.VITE_API_URL).origin })
  csrfReady = true
}
