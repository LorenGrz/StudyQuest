import type { ReactNode } from 'react'
import { AppShell } from './AppShell'

interface Props {
  children: ReactNode
}

export function MobileLayout({ children }: Props) {
  return <AppShell>{children}</AppShell>
}

export function AuthLayout({ children }: Props) {
  return (
    <div className="h-full flex items-center justify-center p-4 bg-gradient-to-t from-base via-base to-purple-950/15 overflow-y-auto">
      <div className="w-full max-w-[420px] bg-surface border border-white/8 rounded-3xl p-8 flex flex-col gap-6">
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
  return (
    <div className="h-full bg-gradient-to-b from-base to-elevated flex flex-col w-full max-w-3xl mx-auto self-center overflow-y-auto">
      {children}
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
