import { ChatMessage } from './chat-message.entity';

export function presentChatMessage(message: ChatMessage) {
  return {
    id: message.id,
    type: message.type,
    text: message.text,
    userId: message.userId,
    user: message.user
      ? {
          id: message.user.id,
          username: message.user.username,
          displayName: message.user.displayName,
          avatarUrl: message.user.avatarUrl,
        }
      : undefined,
    attachment: message.attachmentUrl
      ? {
          url: message.attachmentUrl,
          name: message.attachmentName!,
          mimeType: message.attachmentMimeType!,
          sizeBytes: message.attachmentSizeBytes!,
          durationMs: message.attachmentDurationMs,
        }
      : null,
    createdAt:
      message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : message.createdAt,
  };
}
