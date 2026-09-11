import {
  formatQuestHistory,
  CompletedResultWithQuest,
} from './study-history.utils';

describe('formatQuestHistory', () => {
  it('tells the model the user has no history yet', () => {
    expect(formatQuestHistory([])).toBe(
      'El usuario todavía no completó ningún quest.',
    );
  });

  it('formats a quest with its subject, score and questions', () => {
    const results: CompletedResultWithQuest[] = [
      {
        correctAnswers: 8,
        totalQuestions: 10,
        completedAt: new Date('2026-09-05T12:00:00Z'),
        quest: {
          title: 'Termodinámica',
          subject: { name: 'Física I' },
          questions: [
            {
              topic: 'Entropía',
              text: '¿Qué mide la entropía?',
              explanation: 'El desorden de un sistema.',
            },
          ],
        },
      },
    ];

    const text = formatQuestHistory(results);

    expect(text).toContain('Termodinámica');
    expect(text).toContain('Física I');
    expect(text).toContain('8/10 correctas (80%)');
    expect(text).toContain('2026-09-05');
    expect(text).toContain(
      '[Entropía] ¿Qué mide la entropía? → El desorden de un sistema.',
    );
  });

  it('falls back to sane defaults for a missing subject/topic', () => {
    const results: CompletedResultWithQuest[] = [
      {
        correctAnswers: 0,
        totalQuestions: 5,
        completedAt: null,
        quest: {
          title: 'Sin materia',
          subject: null,
          questions: [{ topic: null, text: 'Pregunta', explanation: 'Resp.' }],
        },
      },
    ];

    const text = formatQuestHistory(results);

    expect(text).toContain('materia desconocida');
    expect(text).toContain('fecha desconocida');
    expect(text).toContain('[general] Pregunta → Resp.');
  });

  it('caps the questions listed per quest at 10', () => {
    const questions = Array.from({ length: 15 }, (_, i) => ({
      topic: `Tema ${i}`,
      text: `Pregunta ${i}`,
      explanation: `Explicación ${i}`,
    }));
    const results: CompletedResultWithQuest[] = [
      {
        correctAnswers: 10,
        totalQuestions: 15,
        completedAt: new Date('2026-09-01'),
        quest: {
          title: 'Quest largo',
          subject: { name: 'Materia' },
          questions,
        },
      },
    ];

    const text = formatQuestHistory(results);

    expect(text).toContain('Tema 9');
    expect(text).not.toContain('Tema 10');
  });

  it('joins multiple quests with a blank line between them', () => {
    const base = {
      correctAnswers: 1,
      totalQuestions: 1,
      completedAt: new Date('2026-09-01'),
    };
    const results: CompletedResultWithQuest[] = [
      { ...base, quest: { title: 'A', subject: { name: 'X' }, questions: [] } },
      { ...base, quest: { title: 'B', subject: { name: 'Y' }, questions: [] } },
    ];

    expect(formatQuestHistory(results).split('\n\n')).toHaveLength(2);
  });
});
