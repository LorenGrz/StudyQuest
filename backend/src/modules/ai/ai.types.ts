export type Difficulty = 'easy' | 'medium' | 'hard';

export interface RawQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
  difficulty: Difficulty;
}

export type AiProviderName =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'mock';

export type AiTaskKind = 'quiz_generation';

export interface QuizGenerationOptions {
  provider?: AiProviderName;
  model?: string;
  temperature?: number;
  /**
   * User-supplied topic/focus preferences for the questions. Treated as a
   * lower-priority hint than the system rules — it can steer *what* content to
   * prioritise, never the output format, question count, or language.
   */
  instructions?: string;
  metadata?: {
    useCase?: string;
    costTier?: 'low' | 'balanced' | 'high-quality';
    questTitle?: string;
    sourceType?: 'text' | 'pdf';
  };
}

export interface QuizAiProvider {
  readonly name: AiProviderName;
  supports(task: AiTaskKind): boolean;
  generateQuizQuestionsFromText(
    rawText: string,
    options?: QuizGenerationOptions,
  ): Promise<RawQuestion[]>;
  generateQuizQuestionsFromPdf(
    buffer: Buffer,
    options?: QuizGenerationOptions,
  ): Promise<RawQuestion[]>;
}
