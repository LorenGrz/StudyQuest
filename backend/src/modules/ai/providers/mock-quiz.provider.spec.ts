import { MockQuizProvider } from './mock-quiz.provider';

describe('MockQuizProvider', () => {
  it('returns deterministic quiz questions with valid shape', async () => {
    const provider = new MockQuizProvider();

    const result = await provider.generateQuizQuestionsFromText(
      'Algoritmos y estructuras de datos con grafos y arboles',
    );

    expect(result).toHaveLength(10);
    expect(result[0]).toMatchObject({
      correctIndex: 0,
      difficulty: 'easy',
      topic: 'Algoritmos',
    });
    expect(result[9].difficulty).toBe('hard');
    expect(result[0].options).toHaveLength(4);
  });
});
