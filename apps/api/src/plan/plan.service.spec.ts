import { BadRequestException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import { PlanService } from './plan.service';

const cfg = (v: Record<string, string | undefined>) => ({ get: (k: string) => v[k] }) as never;
const make = (v: Record<string, string | undefined> = {}) =>
  new PlanService(cfg({ AI_SERVICE_URL: 'http://ai', INTERNAL_API_KEY: 'k', ...v }));
const req = (over: Record<string, unknown> = {}) =>
  ({ partySize: 2, category: 'COPAS', budget: 'BAJO', duration: 'NOCHE', locale: 'es', ...over }) as never;

describe('PlanService', () => {
  afterEach(() => {
    (global as { fetch?: unknown }).fetch = undefined;
  });

  it('rechaza si no hay ciudad ni coordenadas', async () => {
    await expect(make().generate(req())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza si no hay clave interna', async () => {
    const svc = new PlanService(cfg({ AI_SERVICE_URL: 'http://ai' }));
    await expect(svc.generate(req({ locationText: 'Madrid' }))).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('reenvía el cuerpo en snake_case y traduce la respuesta a camelCase', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        intro: 'hola',
        source: 'ai',
        model_used: 'm',
        activities: [
          { title: 'T', place_name: 'P', description: 'd', duration_label: '1h', cost_label: '5', map_query: 'P ciudad' },
        ],
      }),
    }) as never;
    const res = await make().generate(req({ locationText: 'Madrid' }));
    expect(res.activities[0].placeName).toBe('P');
    expect(res.activities[0].durationLabel).toBe('1h');
    expect(res.activities[0].mapQuery).toBe('P ciudad');
    const sent = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(sent.party_size).toBe(2);
    expect(sent.location_text).toBe('Madrid');
  });

  it('propaga el 503 del ai-service', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as never;
    await expect(make().generate(req({ locationText: 'Madrid' }))).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('lanza 502 ante otros errores', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as never;
    await expect(make().generate(req({ locationText: 'Madrid' }))).rejects.toBeInstanceOf(HttpException);
  });
});
