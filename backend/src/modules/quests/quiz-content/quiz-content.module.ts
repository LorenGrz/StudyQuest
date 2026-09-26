import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QuizContentRepository } from './quiz-content.repository';
import { DynamoQuizContentRepository } from './dynamo-quiz-content.repository';
import {
  createDynamoClient,
  createDynamoDocumentClient,
  resolveDynamoSettings,
} from './dynamo.config';

/**
 * Provides the quiz-content store (DynamoDB). Split out of QuestsModule so
 * modules that only need to read quiz content (e.g. the study bot) don't pull
 * in QuestsModule's whole dependency graph. QuestsModule re-exports it.
 */
@Module({
  providers: [
    {
      provide: QuizContentRepository,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const get = (key: string) => cfg.get<string>(key);
        const settings = resolveDynamoSettings(get);
        const doc = createDynamoDocumentClient(
          createDynamoClient(settings, get),
        );
        return new DynamoQuizContentRepository(doc, settings.tableName);
      },
    },
  ],
  exports: [QuizContentRepository],
})
export class QuizContentModule {}
