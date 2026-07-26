import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { SidebarNav } from './SidebarNav'

interface NavDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NavDrawer({ open, onOpenChange }: NavDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-n-900/40 md:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-n-200 bg-white shadow-dialog outline-none md:hidden"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-n-200 px-5">
            <DialogPrimitive.Title className="text-base font-semibold tracking-tight text-n-900">
              Slate
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close navigation"
              className="rounded-sm p-1.5 text-n-500 transition-colors hover:bg-n-100 hover:text-n-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <SidebarNav onNavigate={() => onOpenChange(false)} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
