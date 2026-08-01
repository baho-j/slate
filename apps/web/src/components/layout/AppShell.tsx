import { type ReactNode, useState } from 'react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { NavDrawer } from './NavDrawer'
import { SidebarNav } from './SidebarNav'
import { TopBar } from './TopBar'

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-n-50">
      <aside className="hidden w-60 shrink-0 border-r border-n-200 bg-white md:block">
        <div className="flex h-14 items-center gap-2 border-b border-n-200 px-5">
          <BrandLogo className="size-5" />
          <span className="text-base font-semibold tracking-tight text-n-900">Slate</span>
        </div>
        <SidebarNav />
      </aside>

      <NavDrawer open={navOpen} onOpenChange={setNavOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenNav={() => setNavOpen(true)} />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
