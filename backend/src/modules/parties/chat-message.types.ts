export const CHAT_MESSAGE_TYPES = ['text', 'file', 'audio'] as const;

export type ChatMessageType = (typeof CHAT_MESSAGE_TYPES)[number];

export interface ChatAttachmentPayload {
  url: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  durationMs?: number | null;
}
