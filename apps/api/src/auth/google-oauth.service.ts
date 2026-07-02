import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
}

const DEFAULT_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const DEFAULT_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEFAULT_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const DEFAULT_CALLBACK_URL = 'http://localhost:4000/auth/google/callback';
const HTTP_TIMEOUT_MS = 10_000;

interface TokenResponse {
  access_token?: string;
}

interface UserInfoResponse {
  sub?: string;
  email?: string;
  name?: string;
}

/**
 * Encapsula la interacción con Google. Los endpoints son configurables
 * (con valores por defecto de Google) para poder probar el flujo de extremo
 * a extremo contra un servidor falso sin depender de Google.
 */
@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  constructor(private readonly config: ConfigService) {}

  /** Solo está habilitado si hay client id y secret configurados. */
  get enabled(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  private get clientId(): string {
    return this.config.get<string>('GOOGLE_CLIENT_ID') ?? '';
  }

  private get clientSecret(): string {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET') ?? '';
  }

  private get callbackUrl(): string {
    return this.config.get<string>('GOOGLE_CALLBACK_URL') ?? DEFAULT_CALLBACK_URL;
  }

  buildAuthUrl(state: string): string {
    const base = this.config.get<string>('GOOGLE_AUTH_URL') ?? DEFAULT_AUTH_URL;
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    return `${base}?${params.toString()}`;
  }

  /** Intercambia el código por tokens y obtiene el perfil del usuario. */
  async exchangeCode(code: string): Promise<GoogleProfile> {
    const tokenUrl = this.config.get<string>('GOOGLE_TOKEN_URL') ?? DEFAULT_TOKEN_URL;
    const userinfoUrl = this.config.get<string>('GOOGLE_USERINFO_URL') ?? DEFAULT_USERINFO_URL;

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.callbackUrl,
        grant_type: 'authorization_code',
      }).toString(),
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    if (!tokenRes.ok) {
      throw new Error(`token exchange failed (${tokenRes.status})`);
    }
    const tokens = (await tokenRes.json()) as TokenResponse;
    if (!tokens.access_token) {
      throw new Error('missing access_token');
    }

    const profileRes = await fetch(userinfoUrl, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    if (!profileRes.ok) {
      throw new Error(`userinfo failed (${profileRes.status})`);
    }
    const info = (await profileRes.json()) as UserInfoResponse;
    if (!info.sub || !info.email) {
      throw new Error('incomplete profile');
    }
    return { googleId: info.sub, email: info.email, name: info.name ?? '' };
  }
}
