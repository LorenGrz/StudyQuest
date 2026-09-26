import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { MarkitdownService } from './markitdown.service';
import { BedrockClientService } from './bedrock-client.service';
import { BedrockQuizProvider } from './providers/bedrock-quiz.provider';
import { GeminiQuizProvider } from './providers/gemini-quiz.provider';
import { OpenAiQuizProvider } from './providers/openai-quiz.provider';
import { MockQuizProvider } from './providers/mock-quiz.provider';
import { AnthropicQuizProvider } from './providers/anthropic-quiz.provider';
import { GroqQuizProvider } from './providers/groq-quiz.provider';

@Module({
  providers: [
    AiService,
    MarkitdownService,
    BedrockClientService,
    BedrockQuizProvider,
    GeminiQuizProvider,
    OpenAiQuizProvider,
    AnthropicQuizProvider,
    GroqQuizProvider,
    MockQuizProvider,
  ],
  exports: [AiService, MarkitdownService],
})
export class AiModule {}
