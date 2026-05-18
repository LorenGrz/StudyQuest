import type { ChatMessage } from '../../services/partyService'
import { formatBytes, isAudioMessage } from './chatMessageGuards'

export function ChatMessageItem({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const variantClass =
    message.type === 'audio'
      ? ' chat-message-audio'
      : message.type === 'file'
        ? ' chat-message-file'
        : ''

  return (
    <div className={`chat-message${variantClass}${isOwn ? ' chat-message-own' : ''}`}>
      {!isOwn && (
        <span className="chat-username">
          {message.user?.displayName ?? message.userId.slice(0, 8)}
        </span>
      )}

      {message.type === 'text' && message.text && (
        <p className="chat-text">{message.text}</p>
      )}

      {message.type === 'file' && message.attachment && (
        <div className="chat-attachment-card">
          <div className="chat-attachment-head">
            <span className="chat-attachment-icon" aria-hidden="true">📄</span>
            <div className="chat-attachment-meta">
              <a href={message.attachment.url} target="_blank" rel="noreferrer">
                {message.attachment.name}
              </a>
              <span className="chat-attachment-subtitle">
                {message.attachment.mimeType} · {formatBytes(message.attachment.sizeBytes)}
              </span>
            </div>
          </div>
        </div>
      )}

      {isAudioMessage(message) && message.attachment && (
        <div className="chat-attachment-card">
          <div className="chat-attachment-head">
            <span className="chat-attachment-icon" aria-hidden="true">🎙️</span>
            <div className="chat-attachment-meta">
              <strong className="chat-attachment-title">Nota de voz</strong>
              <span className="chat-attachment-subtitle">
                {Math.max(1, Math.round((message.attachment.durationMs ?? 0) / 1000))}s · {formatBytes(message.attachment.sizeBytes)}
              </span>
            </div>
          </div>
          <audio className="chat-audio-player" controls src={message.attachment.url} />
        </div>
      )}

      <span className="chat-time">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}
