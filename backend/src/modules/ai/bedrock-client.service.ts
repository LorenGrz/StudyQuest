import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

export interface BedrockConverseParams {
  modelId: string;
  system?: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  /** Cancels the HTTP request (caller-side timeout). */
  abortSignal?: AbortSignal;
}

/**
 * Thin wrapper around the Bedrock Converse API. Shared by BedrockQuizProvider
 * (quiz generation, with its own model-chain/retry policy) and AiService.chat
 * (generic single-shot chat, e.g. the study bot).
 */
@Injectable()
export class BedrockClientService {
  private readonly client: BedrockRuntimeClient;

  constructor(private readonly cfg: ConfigService) {
    this.client = new BedrockRuntimeClient({
      region: this.cfg.get<string>('AWS_REGION', 'us-east-1'),
    });
  }

  async converse(params: BedrockConverseParams): Promise<string> {
    const command = new ConverseCommand({
      modelId: params.modelId,
      system: params.system ? [{ text: params.system }] : undefined,
      messages: [{ role: 'user', content: [{ text: params.userMessage }] }],
      inferenceConfig: {
        temperature: params.temperature ?? 0.2,
        maxTokens:
          params.maxTokens ??
          Number(this.cfg.get('AI_MAX_OUTPUT_TOKENS', 8192)),
      },
    });

    const result = await this.client.send(
      command,
      params.abortSignal ? { abortSignal: params.abortSignal } : undefined,
    );
    const text = result.output?.message?.content
      ?.map((block) => block.text)
      .find((t): t is string => typeof t === 'string');

    if (!text) {
      throw new InternalServerErrorException(
        'La respuesta de bedrock no contiene contenido util',
      );
    }
    return text;
  }
}
