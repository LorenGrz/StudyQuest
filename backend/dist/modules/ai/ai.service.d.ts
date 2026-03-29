import { ConfigService } from '@nestjs/config';
export interface RawQuestion {
    text: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
}
export declare class AiService {
    private readonly cfg;
    private readonly logger;
    private readonly genAI;
    private readonly modelName;
    constructor(cfg: ConfigService);
    generateQuestionsFromPdf(buffer: Buffer): Promise<RawQuestion[]>;
    generateQuestionsFromText(rawText: string): Promise<RawQuestion[]>;
    private callGemini;
    private chunkText;
    private validate;
    private deduplicate;
    private safeParseJson;
}
