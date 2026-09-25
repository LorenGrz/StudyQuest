import { useEffect } from 'react'

interface SkillUnlockToastProps {
  nodeNames: string[]
  onDismiss: () => void
}

export function SkillUnlockToast({ nodeNames, onDismiss }: SkillUnlockToastProps) {
  useEffect(() => {
    if (nodeNames.length === 0) {
      return
    }

    const timer = window.setTimeout(() => {
      onDismiss()
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [nodeNames, onDismiss])

  if (nodeNames.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 max-w-[320px] w-full px-4">
      {nodeNames.map((name) => (
        <div key={name} className="bg-surface border border-[var(--overlay-border)] rounded-lg px-4 py-3 text-sm font-semibold text-primary shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center gap-2">🌟 Habilidad desbloqueada: {name}</div>
      ))}
    </div>
  )
}
