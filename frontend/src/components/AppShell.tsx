import type { ReactNode } from 'react'
import { DesktopSidebar, BottomNav } from './nav/AppNav'

interface Props {
  children: ReactNode
}

// App chrome: a left sidebar rail on desktop (lg+), a bottom tab bar on mobile.
// Mobile/tablet keep a readable max width; on desktop the main column fills the
// viewport next to the sidebar (pages cap their own content width via
// PageContainer), so wide screens don't leave dead space on the right.
export function AppShell({ children }: Props) {
  return (
    <div className="h-dvh w-full bg-base text-primary flex overflow-hidden">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col lg:px-6 xl:px-8">
          <div className="w-full mx-auto flex flex-col flex-1 max-w-[480px] md:max-w-2xl lg:max-w-none">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
