"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const generative_ai_1 = require("@google/generative-ai");
const pdfParse = require('pdf-parse');
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
let AiService = AiService_1 = class AiService {
    cfg;
    logger = new common_1.Logger(AiService_1.name);
    genAI;
    modelName;
    constructor(cfg) {
        this.cfg = cfg;
        this.genAI = new generative_ai_1.GoogleGenerativeAI(cfg.getOrThrow('GEMINI_API_KEY'));
        this.modelName = cfg.get('GEMINI_MODEL', 'gemini-1.5-flash');
    }
    async generateQuestionsFromPdf(buffer) {
        this.logger.log('Extrayendo texto del PDF...');
        const { text } = await pdfParse(buffer);
        if (!text || text.trim().length < 200) {
            throw new common_1.InternalServerErrorException('El PDF no tiene suficiente texto');
        }
        return this.generateQuestionsFromText(text);
    }
    async generateQuestionsFromText(rawText) {
        const chunks = this.chunkText(rawText, 3000);
        const maxChunks = Math.min(chunks.length, 3);
        this.logger.log(`Generando preguntas de ${maxChunks} fragmento(s)...`);
        const allQuestions = [];
        for (let i = 0; i < maxChunks; i++) {
            try {
                const questions = await this.callGemini(chunks[i]);
                allQuestions.push(...questions);
                this.logger.log(`Fragmento ${i + 1}/${maxChunks}: ${questions.length} preguntas`);
            }
            catch (err) {
                this.logger.error(`Error en fragmento ${i + 1}: ${err.message}`);
            }
        }
        if (allQuestions.length === 0) {
            throw new common_1.InternalServerErrorException('No se pudieron generar preguntas');
        }
        return this.deduplicate(allQuestions);
    }
    async callGemini(chunk) {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        const result = await model.generateContent(`${QUIZ_PROMPT}\n\nTexto de estudio:\n\n${chunk}`);
        const text = result.response.text();
        const parsed = this.safeParseJson(text);
        const questions = parsed?.questions ?? [];
        return questions.filter(this.validate);
    }
    chunkText(text, maxTokens) {
        const maxChars = maxTokens * 4;
        const paragraphs = text
            .replace(/\r\n/g, '\n')
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter((p) => p.length > 30);
        const chunks = [];
        let current = '';
        for (const paragraph of paragraphs) {
            if ((current + '\n\n' + paragraph).length > maxChars) {
                if (current)
                    chunks.push(current.trim());
                current = paragraph;
            }
            else {
                current += (current ? '\n\n' : '') + paragraph;
            }
        }
        if (current.trim())
            chunks.push(current.trim());
        return chunks;
    }
    validate(q) {
        return (typeof q?.text === 'string' &&
            q.text.length > 10 &&
            Array.isArray(q?.options) &&
            q.options.length === 4 &&
            typeof q?.correctIndex === 'number' &&
            q.correctIndex >= 0 &&
            q.correctIndex <= 3 &&
            typeof q?.explanation === 'string' &&
            typeof q?.topic === 'string' &&
            ['easy', 'medium', 'hard'].includes(q?.difficulty));
    }
    deduplicate(questions) {
        const seen = new Set();
        return questions.filter((q) => {
            const key = q.text.toLowerCase().slice(0, 50);
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    safeParseJson(str) {
        try {
            return JSON.parse(str);
        }
        catch {
            const cleaned = str
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            try {
                return JSON.parse(cleaned);
            }
            catch {
                throw new Error('La respuesta de Gemini no es JSON válido');
            }
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map