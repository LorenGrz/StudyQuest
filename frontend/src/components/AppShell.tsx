import type { ReactNode } from 'react'
import { DesktopSidebar, BottomNav } from './nav/AppNav'

interface Props {
  children: ReactNode
}

// App chrome: a left sidebar rail on desktop (lg+), a bottom tab bar on mobile.
// The main column keeps a readable max width; on desktop it's left-aligned next
// to the sidebar instead of centered in the viewport.
export function AppShell({ children }: Props) {
  return (
    <div className="h-dvh w-full bg-base text-primary flex overflow-hidden">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col lg:px-4">
          <div className="w-full mx-auto flex flex-col flex-1 max-w-[480px] md:max-w-2xl lg:max-w-4xl lg:mx-0">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
