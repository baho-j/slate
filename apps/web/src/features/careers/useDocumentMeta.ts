import { useEffect } from 'react'

interface DocumentMeta {
  title: string
  description?: string
  enabled?: boolean
}

export function useDocumentMeta({ title, description, enabled = true }: DocumentMeta) {
  useEffect(() => {
    if (!enabled) return

    const previousTitle = document.title
    document.title = title

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const created = meta === null
    if (created) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    const previousDescription = meta?.content ?? ''
    if (meta && description !== undefined) {
      meta.content = description
    }

    return () => {
      document.title = previousTitle
      if (created) {
        meta?.remove()
      } else if (meta && description !== undefined) {
        meta.content = previousDescription
      }
    }
  }, [title, description, enabled])
}
