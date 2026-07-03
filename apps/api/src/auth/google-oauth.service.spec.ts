import { GoogleOAuthService } from './google-oauth.service';

const cfg = (v: Record<string, string | undefined>) => ({ get: (k: string) => v[k] }) as never;
const FULL = { GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'sec', GOOGLE_CALLBACK_URL: 'https://api/cb' };

describe('GoogleOAuthService', () => {
  afterEach(() => {
    (global as { fetch?: unknown }).fetch = undefined;
  });

  describe('enabled', () => {
    it('es false sin credenciales', () => {
      expect(new GoogleOAuthService(cfg({})).enabled).toBe(false);
    });
    it('es true con id y secret', () => {
      expect(new GoogleOAuthService(cfg(FULL)).enabled).toBe(true);
    });
  });

  describe('buildAuthUrl', () => {
    it('incluye client_id, redirect_uri, scope y state', () => {
      const url = new GoogleOAuthService(cfg(FULL)).buildAuthUrl('xyz');
      expect(url).toContain('client_id=id');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fapi%2Fcb');
      expect(url).toContain('state=xyz');
      expect(url).toContain('scope=openid+email+profile');
    });
  });

  describe('exchangeCode', () => {
    const full = cfg({ ...FULL, GOOGLE_TOKEN_URL: 'https://t', GOOGLE_USERINFO_URL: 'https://u' });

    it('devuelve el perfil cuando todo va bien', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'at' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ sub: 's1', email: 'e@x.com', name: 'N' }) }) as never;
      const profile = await new GoogleOAuthService(full).exchangeCode('code');
      expect(profile).toEqual({ googleId: 's1', email: 'e@x.com', name: 'N' });
    });

    it('falla si el intercambio de token no es OK', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 400 }) as never;
      await expect(new GoogleOAuthService(full).exchangeCode('c')).rejects.toThrow();
    });

    it('falla si el perfil no trae email', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'at' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ sub: 's1' }) }) as never;
      await expect(new GoogleOAuthService(full).exchangeCode('c')).rejects.toThrow();
    });
  });
});
