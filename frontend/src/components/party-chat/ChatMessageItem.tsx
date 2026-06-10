import type { ChatMessage } from '../../services/partyService'
import { formatBytes, isAudioMessage } from './chatMessageGuards'

export function ChatMessageItem({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const variantClass =
    message.type === 'audio'
      ? ' w-[min(82vw,320px)] min-w-[260px]'
      : message.type === 'file'
        ? ' w-[min(82vw,320px)]'
        : ''

  return (
    <div className={`bg-surface border border-white/8 rounded-[18px] px-3.5 py-3 w-fit max-w-[min(82vw,360px)] min-w-[140px] shadow-[0_10px_24px_rgba(0,0,0,0.18)]${variantClass}${isOwn ? ' self-end bg-[rgba(124,58,237,0.1)] border-[rgba(124,58,237,0.3)]' : ''}`}>
      {!isOwn && (
        <span className="text-xs font-bold text-accent-light">
          {message.user?.displayName ?? message.userId.slice(0, 8)}
        </span>
      )}

      {message.type === 'text' && message.text && (
        <p className="text-sm text-primary mt-1">{message.text}</p>
      )}

      {message.type === 'file' && message.attachment && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <span className="w-9 h-9 rounded-[12px] inline-flex items-center justify-center bg-white/[0.08] shrink-0 text-lg" aria-hidden="true">📄</span>
            <div className="min-w-0 flex flex-col gap-1">
              <a href={message.attachment.url} target="_blank" rel="noreferrer">
                {message.attachment.name}
              </a>
              <span className="text-xs text-muted">
                {message.attachment.mimeType} · {formatBytes(message.attachment.sizeBytes)}
              </span>
            </div>
          </div>
        </div>
      )}

      {isAudioMessage(message) && message.attachment && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <span className="w-9 h-9 rounded-[12px] inline-flex items-center justify-center bg-white/[0.08] shrink-0 text-lg" aria-hidden="true">🎙️</span>
            <div className="min-w-0 flex flex-col gap-1">
              <strong className="text-sm text-primary">Nota de voz</strong>
              <span className="text-xs text-muted">
                {Math.max(1, Math.round((message.attachment.durationMs ?? 0) / 1000))}s · {formatBytes(message.attachment.sizeBytes)}
              </span>
            </div>
          </div>
          <audio className="w-full min-w-[220px] block" controls src={message.attachment.url} />
        </div>
      )}

      <span className="text-[11px] text-muted block mt-1">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}
