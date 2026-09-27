import { useEffect, useRef, useState } from 'react'

export type PollStatus = 'idle' | 'polling' | 'done' | 'timeout'

interface PollOptions {
  /** Polling runs only while this is true. */
  enabled: boolean
  /** Identifies one polling run; a new key restarts polling from scratch. */
  runKey: string
  intervalMs?: number
  timeoutMs?: number
  onDone?: () => void
  onTimeout?: () => void
}

/**
 * Calls `check` right away and then every `intervalMs` until it resolves
 * `true` (→ 'done') or `timeoutMs` elapses (→ 'timeout'). A rejected check
 * counts as "not yet". The pending timer is cleared on unmount, when
 * `enabled` turns false, or when `runKey` changes — nothing leaks.
 */
export function usePollUntil(
  check: () => Promise<boolean>,
  {
    enabled,
    runKey,
    intervalMs = 3000,
    timeoutMs = 60_000,
    onDone,
    onTimeout,
  }: PollOptions,
): PollStatus {
  const [result, setResult] = useState<{
    key: string
    status: 'done' | 'timeout'
  } | null>(null)

  // Latest callbacks without restarting the polling loop when they change.
  const latest = useRef({ check, onDone, onTimeout })
  useEffect(() => {
    latest.current = { check, onDone, onTimeout }
  })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const maxChecks = Math.floor(timeoutMs / intervalMs) + 1
    let checks = 0

    const tick = async () => {
      checks += 1
      let ok = false
      try {
        ok = await latest.current.check()
      } catch {
        ok = false
      }
      if (cancelled) return
      if (ok) {
        setResult({ key: runKey, status: 'done' })
        latest.current.onDone?.()
      } else if (checks >= maxChecks) {
        setResult({ key: runKey, status: 'timeout' })
        latest.current.onTimeout?.()
      } else {
        timer = setTimeout(() => void tick(), intervalMs)
      }
    }
    void tick()

    return () => {
      cancelled = true
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [enabled, runKey, intervalMs, timeoutMs])

  if (!enabled) return 'idle'
  return result?.key === runKey ? result.status : 'polling'
}
