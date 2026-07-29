import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { Toast, ToastDescription, ToastProvider, ToastViewport } from './toast'

type ToastVariant = 'neutral' | 'success' | 'danger'

interface ToastMessage {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastRoot({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const toast = useCallback((message: string, variant: ToastVariant = 'neutral') => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), message, variant }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((message) => message.id !== id))
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      <ToastProvider>
        {children}
        {messages.map((message) => (
          <Toast
            key={message.id}
            variant={message.variant}
            onOpenChange={(open) => {
              if (!open) {
                dismiss(message.id)
              }
            }}
          >
            <ToastDescription>{message.message}</ToastDescription>
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within a ToastRoot')
  }

  return context
}
