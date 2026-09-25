import { useCallback, useRef, useState } from 'react'

interface UseFileDropOptions {
  /** Receives the first dropped or pasted file. */
  onFile: (file: File) => void
  /** Optional type guard. Return false to reject the file (onReject fires). */
  accept?: (file: File) => boolean
  /** Called when a file is dropped/pasted but rejected by `accept`. */
  onReject?: (file: File) => void
  /** When true, drag highlighting and drop/paste handling are disabled. */
  disabled?: boolean
}

/**
 * Adds drag-and-drop and clipboard-paste file input to any element.
 *
 * - Spread `dropZoneProps` onto the container you want to accept drops.
 * - Attach `onPaste` to a focusable element inside it (paste bubbles, so a
 *   parent works too). Paste only intercepts when the clipboard carries a
 *   file — pasting plain text still lands normally in a textarea/input.
 * - `isDragging` is true only while a *file* is dragged over the zone, so you
 *   can show a highlight without reacting to text/element drags.
 */
export function useFileDrop({ onFile, accept, onReject, disabled }: UseFileDropOptions) {
  const [isDragging, setIsDragging] = useState(false)
  // Depth counter so dragleave firing on child nodes doesn't drop the highlight
  // until the pointer actually leaves the whole zone.
  const dragDepth = useRef(0)

  const takeFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return
      if (accept && !accept(file)) {
        onReject?.(file)
        return
      }
      onFile(file)
    },
    [accept, disabled, onFile, onReject],
  )

  const carriesFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types ?? []).includes('Files')

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled || !carriesFiles(e)) return
      e.preventDefault()
      dragDepth.current += 1
      setIsDragging(true)
    },
    [disabled],
  )

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled || !carriesFiles(e)) return
      e.preventDefault() // required so the drop event fires
    },
    [disabled],
  )

  const onDragLeave = useCallback(
    () => {
      if (disabled) return
      dragDepth.current -= 1
      if (dragDepth.current <= 0) {
        dragDepth.current = 0
        setIsDragging(false)
      }
    },
    [disabled],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      dragDepth.current = 0
      setIsDragging(false)
      takeFile(e.dataTransfer.files?.[0])
    },
    [disabled, takeFile],
  )

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (disabled) return
      const file = e.clipboardData?.files?.[0]
      if (!file) return // no file on the clipboard → let the default text paste happen
      e.preventDefault()
      takeFile(file)
    },
    [disabled, takeFile],
  )

  const dropZoneProps = { onDragEnter, onDragOver, onDragLeave, onDrop }

  return { isDragging, dropZoneProps, onPaste }
}
