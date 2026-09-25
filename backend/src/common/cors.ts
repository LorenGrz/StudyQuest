/**
 * CORS origin allowlist. Set `CORS_ALLOWED_ORIGINS` (comma-separated) in prod;
 * falls back to the local dev origins. Used for both HTTP (`enableCors`) and the
 * Socket.IO gateway.
 */
export function allowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [
    'http://localhost:5173',
    'http://localhost:5199',
    'http://localhost:4173',
  ];
}

type OriginCallback = (err: Error | null, allow?: boolean) => void;

/**
 * `origin` callback shape shared by express-cors and socket.io. Requests with no
 * Origin header (curl, server-to-server, same-origin) are allowed; a browser
 * Origin must be in the allowlist.
 */
export function corsOrigin(
  origin: string | undefined,
  cb: OriginCallback,
): void {
  if (!origin || allowedOrigins().includes(origin)) {
    cb(null, true);
  } else {
    cb(new Error(`Origin no permitido: ${origin}`), false);
  }
}
