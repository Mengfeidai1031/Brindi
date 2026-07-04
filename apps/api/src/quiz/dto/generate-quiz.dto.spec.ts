import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GenerateQuizDto } from './generate-quiz.dto';

async function errorsFor(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(GenerateQuizDto, payload);
  const errors = await validate(dto);
  return errors.map((e) => e.property);
}

describe('GenerateQuizDto', () => {
  const base = { level: 'FACIL', count: 5, locale: 'es' };

  it('acepta una categoría predefinida sin tema', async () => {
    expect(await errorsFor({ ...base, category: 'GEOGRAFIA' })).toEqual([]);
  });

  it('rechaza OTROS sin tema', async () => {
    expect(await errorsFor({ ...base, category: 'OTROS' })).toContain('topic');
  });

  it('acepta OTROS con tema', async () => {
    expect(await errorsFor({ ...base, category: 'OTROS', topic: 'Star Wars' })).toEqual([]);
  });

  it('rechaza una categoría inexistente', async () => {
    expect(await errorsFor({ ...base, category: 'NO_EXISTE' })).toContain('category');
  });
});
