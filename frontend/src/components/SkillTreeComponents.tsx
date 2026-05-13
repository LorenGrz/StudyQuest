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
    <div className="skill-unlock-toast">
      {nodeNames.map((name) => (
        <div key={name}>🌟 Habilidad desbloqueada: {name}</div>
      ))}
    </div>
  )
}
