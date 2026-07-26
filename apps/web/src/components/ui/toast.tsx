import * as ToastPrimitive from '@radix-ui/react-toast'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export const ToastProvider = ToastPrimitive.Provider
export const ToastTitle = ToastPrimitive.Title
export const ToastDescription = ToastPrimitive.Description

const toastVariants = cva(
  'flex items-start gap-3 rounded-sm border bg-white p-4 shadow-menu data-[state=closed]:opacity-0',
  {
    variants: {
      variant: {
        neutral: 'border-n-200',
        success: 'border-success/30',
        danger: 'border-danger/30',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
)

type ToastProps = ComponentProps<typeof ToastPrimitive.Root> & VariantProps<typeof toastVariants>

export function Toast({ className, variant, children, ...props }: ToastProps) {
  return (
    <ToastPrimitive.Root className={cn(toastVariants({ variant }), className)} {...props}>
      <div className="flex-1 text-sm">{children}</div>
      <ToastPrimitive.Close
        aria-label="Dismiss"
        className="rounded-xs p-0.5 text-n-500 transition-colors hover:bg-n-100 hover:text-n-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <X className="size-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  )
}

export function ToastViewport({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        'fixed right-0 bottom-0 z-50 flex w-full max-w-sm flex-col gap-2 p-4 outline-none',
        className,
      )}
      {...props}
    />
  )
}
