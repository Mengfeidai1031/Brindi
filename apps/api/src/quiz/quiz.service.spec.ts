import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { QuizService } from './quiz.service';

const cfg = (v: Record<string, string | undefined>) => ({ get: (k: string) => v[k] }) as never;
const body = { category: 'GEOGRAFIA', level: 'FACIL', count: 5, locale: 'es' } as never;

describe('QuizService', () => {
  afterEach(() => {
    (global as { fetch?: unknown }).fetch = undefined;
  });

  it('traduce la respuesta del ai-service a camelCase y envía X-Internal-Key', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        questions: [{ question: 'Q', options: ['a', 'b', 'c', 'd'], correct_index: 2, explanation: 'e' }],
        source: 'fallback',
        model_used: null,
      }),
    }) as never;
    const svc = new QuizService(cfg({ AI_SERVICE_URL: 'http://ai', INTERNAL_API_KEY: 'k' }));
    const res = await svc.generate(body);
    expect(res.source).toBe('fallback');
    expect(res.questions[0].correctIndex).toBe(2);
    const opts = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(opts.headers['X-Internal-Key']).toBe('k');
  });

  it('lanza 503 si no hay clave interna configurada', async () => {
    const svc = new QuizService(cfg({ AI_SERVICE_URL: 'http://ai' }));
    await expect(svc.generate(body)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('lanza 503 si no puede contactar con el ai-service', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('conn')) as never;
    const svc = new QuizService(cfg({ AI_SERVICE_URL: 'http://ai', INTERNAL_API_KEY: 'k' }));
    await expect(svc.generate(body)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('lanza 502 ante respuesta no OK del ai-service', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502 }) as never;
    const svc = new QuizService(cfg({ AI_SERVICE_URL: 'http://ai', INTERNAL_API_KEY: 'k' }));
    await expect(svc.generate(body)).rejects.toBeInstanceOf(HttpException);
  });
});
