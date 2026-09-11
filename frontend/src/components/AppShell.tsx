import type { ReactNode } from 'react'
import { DesktopSidebar, BottomNav } from './nav/AppNav'
import { StudyBotWidget } from './study-bot/StudyBotWidget'

interface Props {
  children: ReactNode
}

// App chrome: a left nav that is an icon-only rail on tablet (md) and a full
// labelled sidebar on desktop (lg+); a bottom tab bar only on phones (< md).
// Phones keep a readable max width; from md up the main column fills the
// viewport next to the rail (pages cap their own content width via
// PageContainer), so wider screens don't leave dead space on the right.
export function AppShell({ children }: Props) {
  return (
    <div className="h-dvh w-full bg-base text-primary flex overflow-hidden">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col md:px-4 lg:px-6 xl:px-8">
          <div className="w-full mx-auto flex flex-col flex-1 max-w-[480px] md:max-w-none">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
      <StudyBotWidget />
    </div>
  )
}
