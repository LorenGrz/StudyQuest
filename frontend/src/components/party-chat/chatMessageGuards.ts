import type { ChatMessage } from '../../services/partyService'

export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export function isAllowedChatFile(file: File) {
  return [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ].includes(file.type)
}

export function isAudioMessage(message: ChatMessage) {
  return message.type === 'audio' && !!message.attachment
}
