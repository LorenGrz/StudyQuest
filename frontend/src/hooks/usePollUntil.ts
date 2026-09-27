import { useEffect, useRef, useState } from 'react'

export type PollStatus = 'idle' | 'polling' | 'done' | 'stopped' | 'timeout'

/** What one check found: finished, keep waiting, or give up (don't retry). */
export type PollCheck = 'done' | 'wait' | 'stop'

interface PollOptions {
  /** Polling runs only while this is true. */
  enabled: boolean
  /** Identifies one polling run; a new key restarts polling from scratch. */
  runKey: string
  intervalMs?: number
  timeoutMs?: number
  onDone?: () => void
  onStop?: () => void
  onTimeout?: () => void
}

/**
 * Calls `check` right away and then every `intervalMs` until it resolves
 * 'done' or 'stop', or `timeoutMs` elapses (→ 'timeout'). A rejected check
 * counts as 'wait'. The pending timer is cleared on unmount, when
 * `enabled` turns false, or when `runKey` changes — nothing leaks.
 */
export function usePollUntil(
  check: () => Promise<PollCheck>,
  {
    enabled,
    runKey,
    intervalMs = 3000,
    timeoutMs = 60_000,
    onDone,
    onStop,
    onTimeout,
  }: PollOptions,
): PollStatus {
  const [result, setResult] = useState<{
    key: string
    status: 'done' | 'stopped' | 'timeout'
  } | null>(null)

  // Latest callbacks without restarting the polling loop when they change.
  const latest = useRef({ check, onDone, onStop, onTimeout })
  useEffect(() => {
    latest.current = { check, onDone, onStop, onTimeout }
  })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const maxChecks = Math.floor(timeoutMs / intervalMs) + 1
    let checks = 0

    const tick = async () => {
      checks += 1
      let found: PollCheck = 'wait'
      try {
        found = await latest.current.check()
      } catch {
        found = 'wait'
      }
      if (cancelled) return
      if (found === 'done') {
        setResult({ key: runKey, status: 'done' })
        latest.current.onDone?.()
      } else if (found === 'stop') {
        setResult({ key: runKey, status: 'stopped' })
        latest.current.onStop?.()
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
