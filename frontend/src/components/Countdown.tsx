import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CountdownProps {
  targetDate: string
  onComplete?: () => void
  /** 'hms' shows HH:MM:SS, 'ms' shows MM:SS (default: 'hms') */
  format?: 'hms' | 'ms'
  className?: string
}

export function Countdown({ targetDate, onComplete, format = 'hms', className }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(targetDate).getTime() - Date.now()

      if (difference <= 0) {
        setTimeLeft(format === 'ms' ? '00:00' : '00:00:00')
        setIsUrgent(false)
        onComplete?.()
        return
      }

      setIsUrgent(difference < 10_000)

      if (format === 'ms') {
        const minutes = Math.floor((difference / 1000 / 60) % 60)
        const seconds = Math.floor((difference / 1000) % 60)
        setTimeLeft(
          `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        )
      } else {
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
        const minutes = Math.floor((difference / 1000 / 60) % 60)
        const seconds = Math.floor((difference / 1000) % 60)
        setTimeLeft(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        )
      }
    }

    calculateTime()
    const timer = setInterval(calculateTime, 1000)
    return () => clearInterval(timer)
  }, [targetDate, onComplete, format])

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={timeLeft}
        initial={{ opacity: 0.6, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={`font-mono font-bold tabular-nums ${isUrgent ? 'text-danger animate-pulse' : ''} ${className ?? ''}`}
      >
        {timeLeft}
      </motion.span>
    </AnimatePresence>
  )
}
