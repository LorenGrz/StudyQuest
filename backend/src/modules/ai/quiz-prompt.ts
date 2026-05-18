import { QuizGenerationOptions } from './ai.types';

export const QUIZ_PROMPT = `Sos un profesor universitario experto en evaluacion educativa.
Dado el siguiente texto de estudio, genera exactamente 10 preguntas de opcion multiple.

Reglas:
1. Exactamente 10 preguntas.
2. Cada pregunta tiene exactamente 4 opciones.
3. Solo UNA opcion es correcta.
4. Las opciones incorrectas deben ser plausibles.
5. La explicacion debe ser educativa, de 1-3 oraciones.
6. El topic debe ser el subtema especifico (ej: "Teorema de Bayes").
7. Distribui dificultades: 30% easy, 50% medium, 20% hard.

Responde UNICAMENTE con JSON valido, sin texto adicional ni backticks.
Estructura exacta:
{
  "questions": [
    {
      "text": "pregunta aqui",
      "options": ["opcion A", "opcion B", "opcion C", "opcion D"],
      "correctIndex": 0,
      "explanation": "explicacion aqui",
      "topic": "subtema aqui",
      "difficulty": "easy"
    }
  ]
}`;

export function buildQuizUserPrompt(
  chunk: string,
  options?: QuizGenerationOptions,
): string {
  const title = options?.metadata?.questTitle?.trim();
  const sourceType = options?.metadata?.sourceType;

  const context: string[] = [];

  if (title) {
    context.push(
      `Titulo/foco del quiz: ${title}\nUsa este titulo como guia de enfoque. Prioriza preguntas directamente relacionadas con ese tema, pero sin inventar contenido que no este respaldado por la fuente.`,
    );
  }

  if (sourceType === 'pdf') {
    context.push(
      'La fuente principal es un PDF subido por el usuario. Genera preguntas solo a partir del contenido extraido de ese PDF.',
    );
  } else {
    context.push(
      'La fuente principal es el texto pegado por el usuario. Genera preguntas solo a partir de ese contenido.',
    );
  }

  context.push(`Contenido de estudio:\n\n${chunk}`);

  return context.join('\n\n');
}
