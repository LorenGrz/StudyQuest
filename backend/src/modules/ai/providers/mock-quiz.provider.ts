import { Injectable } from '@nestjs/common';
import {
  AiTaskKind,
  QuizAiProvider,
  QuizGenerationOptions,
  RawQuestion,
} from '../ai.types';
import { extractTextFromPdf } from '../raw-question.utils';

@Injectable()
export class MockQuizProvider implements QuizAiProvider {
  readonly name = 'mock' as const;

  supports(task: AiTaskKind): boolean {
    return task === 'quiz_generation';
  }

  async generateQuizQuestionsFromPdf(
    buffer: Buffer,
    options?: QuizGenerationOptions,
  ): Promise<RawQuestion[]> {
    const text = await extractTextFromPdf(buffer);
    return this.generateQuizQuestionsFromText(text, options);
  }

  async generateQuizQuestionsFromText(
    rawText: string,
    options?: QuizGenerationOptions,
  ): Promise<RawQuestion[]> {
    const topic = options?.metadata?.questTitle?.trim() || this.pickTopic(rawText);
    return Array.from({ length: 10 }).map((_, index) => ({
      text: `Pregunta mock ${index + 1} sobre ${topic}?`,
      options: [
        `Respuesta correcta ${index + 1}`,
        `Distractor A ${index + 1}`,
        `Distractor B ${index + 1}`,
        `Distractor C ${index + 1}`,
      ],
      correctIndex: 0,
      explanation: `Explicacion mock para ${topic} en la pregunta ${index + 1}.`,
      topic,
      difficulty: index < 3 ? 'easy' : index < 8 ? 'medium' : 'hard',
    }));
  }

  private pickTopic(rawText: string): string {
    const words = rawText
      .split(/\s+/)
      .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
      .filter((word) => word.length > 4);

    return words[0] ?? 'tema general';
  }
}
