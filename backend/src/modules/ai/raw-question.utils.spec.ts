import { InternalServerErrorException } from '@nestjs/common';
import { extractTextFromPdf } from './raw-question.utils';

const destroy = jest.fn().mockResolvedValue(undefined);
const getText = jest.fn();

jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText,
    destroy,
  })),
}));

describe('extractTextFromPdf', () => {
  beforeEach(() => {
    destroy.mockClear();
    getText.mockReset();
  });

  it('reads text through the PDFParse class API', async () => {
    getText.mockResolvedValue({
      text: 'Bases de datos, SQL, joins, indices, claves primarias y normalizacion en sistemas relacionales.',
    });

    await expect(extractTextFromPdf(Buffer.from('pdf'))).resolves.toContain(
      'Bases de datos',
    );
    expect(getText).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
  });

  it('rejects PDFs without enough extracted text', async () => {
    getText.mockResolvedValue({ text: 'Muy corto' });

    await expect(extractTextFromPdf(Buffer.from('pdf'))).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(destroy).toHaveBeenCalled();
  });
});
