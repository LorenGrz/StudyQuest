import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin client for the MarkItDown sidecar (see /markitdown-service). Converts an
 * uploaded document buffer into Markdown so the quiz generator can use the text
 * path instead of sending raw PDF bytes to a multimodal model.
 */
@Injectable()
export class MarkitdownService {
  private readonly logger = new Logger(MarkitdownService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly cfg: ConfigService) {
    this.baseUrl = this.cfg
      .get<string>('MARKITDOWN_URL', 'http://markitdown:8000')
      .replace(/\/$/, '');
    this.timeoutMs = Number(this.cfg.get('MARKITDOWN_TIMEOUT_MS', 30000));
  }

  async toMarkdown(buffer: Buffer, filename = 'document.pdf'): Promise<string> {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buffer)]), filename);

    const res = await fetch(`${this.baseUrl}/convert`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`markitdown respondió ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = (await res.json()) as { markdown?: string; chars?: number };
    const markdown = data.markdown ?? '';
    this.logger.debug(`markitdown convirtió ${filename} → ${markdown.length} chars`);
    return markdown;
  }
}
