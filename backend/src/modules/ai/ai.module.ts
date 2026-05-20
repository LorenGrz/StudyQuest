import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { GeminiQuizProvider } from './providers/gemini-quiz.provider';
import { OpenAiQuizProvider } from './providers/openai-quiz.provider';
import { MockQuizProvider } from './providers/mock-quiz.provider';
import { AnthropicQuizProvider } from './providers/anthropic-quiz.provider';
import { GroqQuizProvider } from './providers/groq-quiz.provider';

@Module({
  providers: [
    AiService,
    GeminiQuizProvider,
    OpenAiQuizProvider,
    AnthropicQuizProvider,
    GroqQuizProvider,
    MockQuizProvider,
  ],
  exports: [AiService],
})
export class AiModule {}
