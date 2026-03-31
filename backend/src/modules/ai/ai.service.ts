import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
const pdfParse = require('pdf-parse');
export interface RawQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const QUIZ_PROMPT = `Sos un profesor universitario experto en evaluación educativa.
Dado el siguiente texto de estudio, generá exactamente 10 preguntas de opción múltiple.

Reglas:
1. Exactamente 10 preguntas.
2. Cada pregunta tiene exactamente 4 opciones.
3. Solo UNA opción es correcta.
4. Las opciones incorrectas deben ser plausibles.
5. La explicación debe ser educativa, de 1-3 oraciones.
6. El topic debe ser el subtema específico (ej: "Teorema de Bayes").
7. Distribuí dificultades: 30% easy, 50% medium, 20% hard.

Respondé ÚNICAMENTE con JSON válido, sin texto adicional ni backticks.
Estructura exacta:
{
  "questions": [
    {
      "text": "pregunta aquí",
      "options": ["opción A", "opción B", "opción C", "opción D"],
      "correctIndex": 0,
      "explanation": "explicación aquí",
      "topic": "subtema aquí",
      "difficulty": "easy"
    }
  ]
}`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly cfg: ConfigService) {
    this.genAI = new GoogleGenerativeAI(cfg.getOrThrow('GEMINI_API_KEY'));
    this.modelName = cfg.get('GEMINI_MODEL', 'gemini-1.5-flash');
  }

  async generateQuestionsFromPdf(buffer: Buffer): Promise<RawQuestion[]> {
    this.logger.log('Extrayendo texto del PDF...');
    const { text } = await pdfParse(buffer);
    if (!text || text.trim().length < 200) {
      throw new InternalServerErrorException(
        'El PDF no tiene suficiente texto',
      );
    }
    return this.generateQuestionsFromText(text);
  }

  async generateQuestionsFromText(rawText: string): Promise<RawQuestion[]> {
    const chunks = this.chunkText(rawText, 3000);
    const maxChunks = Math.min(chunks.length, 3);
    this.logger.log(`Generando preguntas de ${maxChunks} fragmento(s)...`);

    const allQuestions: RawQuestion[] = [];

    for (let i = 0; i < maxChunks; i++) {
      try {
        const questions = await this.callGemini(chunks[i]);
        allQuestions.push(...questions);
        this.logger.log(
          `Fragmento ${i + 1}/${maxChunks}: ${questions.length} preguntas`,
        );
      } catch (err) {
        this.logger.error(`Error en fragmento ${i + 1}: ${err.message}`);
      }
    }

    if (allQuestions.length === 0) {
      throw new InternalServerErrorException(
        'No se pudieron generar preguntas',
      );
    }

    return this.deduplicate(allQuestions);
  }

  private async callGemini(chunk: string): Promise<RawQuestion[]> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });

    const result = await model.generateContent(
      `${QUIZ_PROMPT}\n\nTexto de estudio:\n\n${chunk}`,
    );

    const text = result.response.text();
    const parsed = this.safeParseJson(text);
    const questions: RawQuestion[] = parsed?.questions ?? [];

    return questions.filter(this.validate);
  }

  private chunkText(text: string, maxTokens: number): string[] {
    const maxChars = maxTokens * 4;
    const paragraphs = text
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 30);

    const chunks: string[] = [];
    let current = '';

    for (const paragraph of paragraphs) {
      if ((current + '\n\n' + paragraph).length > maxChars) {
        if (current) chunks.push(current.trim());
        current = paragraph;
      } else {
        current += (current ? '\n\n' : '') + paragraph;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  private validate(q: any): q is RawQuestion {
    return (
      typeof q?.text === 'string' &&
      q.text.length > 10 &&
      Array.isArray(q?.options) &&
      q.options.length === 4 &&
      typeof q?.correctIndex === 'number' &&
      q.correctIndex >= 0 &&
      q.correctIndex <= 3 &&
      typeof q?.explanation === 'string' &&
      typeof q?.topic === 'string' &&
      ['easy', 'medium', 'hard'].includes(q?.difficulty)
    );
  }

  private deduplicate(questions: RawQuestion[]): RawQuestion[] {
    const seen = new Set<string>();
    return questions.filter((q) => {
      const key = q.text.toLowerCase().slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private safeParseJson(str: string): any {
    try {
      return JSON.parse(str);
    } catch {
      const cleaned = str
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        throw new Error('La respuesta de Gemini no es JSON válido');
      }
    }
  }
}
