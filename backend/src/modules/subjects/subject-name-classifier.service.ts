import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import {
  buildClassifierUserPrompt,
  ClassifierInput,
  ClassifierVerdict,
  parseClassifierOutput,
  SUBJECT_CLASSIFIER_SYSTEM_PROMPT,
} from './subject-classifier.prompt';

/** Nova Lite: the cheapest of the three Bedrock profiles the app may call. */
export const DEFAULT_CLASSIFIER_MODEL = 'us.amazon.nova-lite-v1:0';
export const DEFAULT_CLASSIFIER_TIMEOUT_MS = 6000;

export type ClassifierResult =
  | {
      status: 'ok';
      verdict: ClassifierVerdict;
      provider: 'bedrock' | 'mock';
      model: string | null;
      latencyMs: number;
    }
  | {
      /** Timeout, provider error or output that failed the schema. */
      status: 'unavailable';
      error: 'timeout' | 'provider_error' | 'invalid_output';
      provider: 'bedrock';
      model: string;
      latencyMs: number;
    };

/**
 * Layer 3: AI classifier over AiService.chat (Bedrock Converse, independent
 * of the quiz-generation provider chain, so quest generation is untouched).
 * Fail-closed: the caller rejects on anything but `status: 'ok'` with
 * `verdict.valid === true`.
 *
 * With AI_PROVIDER=mock (local dev without AWS) no model is called and every
 * name that passed layers 1/2 is accepted, marked `provider: 'mock'` in
 * `subjects.moderation`. Prod runs AI_PROVIDER=bedrock.
 */
@Injectable()
export class SubjectNameClassifier {
  private readonly logger = new Logger(SubjectNameClassifier.name);

  constructor(
    private readonly cfg: ConfigService,
    private readonly aiService: AiService,
  ) {}

  async classify(input: ClassifierInput): Promise<ClassifierResult> {
    const started = Date.now();
    if (this.cfg.get<string>('AI_PROVIDER') === 'mock') {
      return {
        status: 'ok',
        provider: 'mock',
        model: null,
        latencyMs: 0,
        verdict: {
          valid: true,
          category: 'subject',
          reason: 'AI_PROVIDER=mock: sin clasificador real',
          suggestedName: null,
        },
      };
    }

    const model = this.cfg.get<string>(
      'SUBJECT_CLASSIFIER_MODEL',
      DEFAULT_CLASSIFIER_MODEL,
    );
    const timeoutMs = Number(
      this.cfg.get(
        'SUBJECT_CLASSIFIER_TIMEOUT_MS',
        DEFAULT_CLASSIFIER_TIMEOUT_MS,
      ),
    );
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve('timeout');
      }, timeoutMs);
    });

    try {
      const raw = await Promise.race([
        this.aiService.chat(
          SUBJECT_CLASSIFIER_SYSTEM_PROMPT,
          buildClassifierUserPrompt(input),
          {
            model,
            maxTokens: 200,
            temperature: 0,
            abortSignal: controller.signal,
          },
        ),
        timeout,
      ]);
      const latencyMs = Date.now() - started;
      if (raw === 'timeout') {
        this.logger.warn(`Clasificador de materias: timeout (${timeoutMs} ms)`);
        return {
          status: 'unavailable',
          error: 'timeout',
          provider: 'bedrock',
          model,
          latencyMs,
        };
      }
      const verdict = parseClassifierOutput(raw);
      if (!verdict) {
        this.logger.warn(
          `Clasificador de materias: salida inválida (${String(raw).slice(0, 200)})`,
        );
        return {
          status: 'unavailable',
          error: 'invalid_output',
          provider: 'bedrock',
          model,
          latencyMs,
        };
      }
      return { status: 'ok', verdict, provider: 'bedrock', model, latencyMs };
    } catch (err) {
      const latencyMs = Date.now() - started;
      const aborted = controller.signal.aborted;
      this.logger.error(
        `Clasificador de materias: ${aborted ? 'timeout' : 'error'} ${(err as Error)?.message}`,
      );
      return {
        status: 'unavailable',
        error: aborted ? 'timeout' : 'provider_error',
        provider: 'bedrock',
        model,
        latencyMs,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
