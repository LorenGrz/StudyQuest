import type { ReactNode } from 'react'
import { AppShell } from './AppShell'
import { DesktopSidebar } from './nav/AppNav'

interface Props {
  children: ReactNode
}

export function MobileLayout({ children }: Props) {
  return <AppShell>{children}</AppShell>
}

export function AuthLayout({ children }: Props) {
  return (
    <div className="h-full flex items-center justify-center p-4 bg-gradient-to-t from-base via-base to-purple-950/15 overflow-y-auto">
      <div className="w-full max-w-[420px] bg-surface border border-[var(--overlay-border)] rounded-3xl p-8 flex flex-col gap-6">
        <div className="text-center">
          <span className="text-[48px] block mb-2">⚡</span>
          <h1 className="text-[28px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-purple-700">StudyQuest</h1>
          <p className="text-muted text-sm mt-1">Estudia. Compite. Gana.</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export function GameLayout({ children }: Props) {
  // Quiz = focus view: the desktop sidebar for navigation, but no bottom bar.
  // Same width scale as AppShell so the quiz doesn't look narrower than the app.
  return (
    <div className="h-dvh w-full bg-base text-primary flex overflow-hidden">
      <DesktopSidebar />
      <div className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-base to-elevated flex flex-col lg:px-4">
        <div className="w-full mx-auto flex flex-col flex-1 max-w-[480px] md:max-w-2xl lg:max-w-4xl lg:mx-0">
          {children}
        </div>
      </div>
    </div>
  )
}

export function FullscreenLayout({ children }: Props) {
  return (
    <AppShell>
      <div className="flex min-h-full items-center justify-center p-6">
        {children}
      </div>
    </AppShell>
  )
}
