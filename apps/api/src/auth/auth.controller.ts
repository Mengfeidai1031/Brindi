import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE_MS,
  REFRESH_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
} from './auth.constants';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** 10 peticiones/minuto en endpoints sensibles (equivalente a throttle:10,1). */
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly google: GoogleOAuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Registro con email y contraseña' })
  @ApiCreatedResponse({ description: 'Usuario creado; devuelve accessToken y fija cookie de refresco' })
  @ApiConflictResponse({ description: 'El email ya está registrado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.register(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { user, accessToken: tokens.accessToken };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Login con email y contraseña' })
  @ApiOkResponse({ description: 'Devuelve accessToken y rota la cookie de refresco' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.login(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { user, accessToken: tokens.accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Renueva el access token usando la cookie de refresco (rotación)' })
  @ApiOkResponse({ description: 'Nuevo accessToken; la cookie de refresco se rota' })
  @ApiUnauthorizedResponse({ description: 'Cookie ausente, inválida o caducada' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const { user, tokens } = await this.auth.refresh(cookies?.[REFRESH_COOKIE_NAME]);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { user, accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cierra la sesión eliminando la cookie de refresco' })
  @ApiOkResponse({ description: 'Cookie de refresco eliminada' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
    return { success: true };
  }

  @Get('providers')
  @ApiOperation({ summary: 'Métodos de inicio de sesión disponibles (p. ej. Google)' })
  @ApiOkResponse({ description: 'Indica qué proveedores externos están configurados' })
  providers() {
    return { google: this.google.enabled };
  }

  @Get('google')
  @ApiOperation({ summary: 'Inicia el flujo OAuth de Google (redirección)' })
  googleStart(@Query('locale') locale: string | undefined, @Res() res: Response): void {
    if (!this.google.enabled) {
      res.redirect(`${this.webOrigin()}/login?error=google_unavailable`);
      return;
    }
    const nonce = randomBytes(16).toString('hex');
    const safeLocale = locale === 'en' ? 'en' : 'es';
    const state = Buffer.from(JSON.stringify({ n: nonce, l: safeLocale }), 'utf8').toString('base64url');
    res.cookie(OAUTH_STATE_COOKIE, nonce, {
      httpOnly: true,
      // Lax (no Strict): la cookie debe llegar en la navegación de vuelta desde Google.
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: REFRESH_COOKIE_PATH,
      maxAge: OAUTH_STATE_MAX_AGE_MS,
    });
    res.redirect(this.google.buildAuthUrl(state));
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Callback de Google: crea/vincula la cuenta y fija la sesión' })
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const fail = (reason: string) => res.redirect(`${this.webOrigin()}/login?error=${reason}`);

    if (error || !code || !state) {
      fail('google_failed');
      return;
    }

    let decoded: { n?: string; l?: string };
    try {
      decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    } catch {
      fail('google_failed');
      return;
    }

    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const cookieNonce = cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE, { path: REFRESH_COOKIE_PATH });
    if (!cookieNonce || cookieNonce !== decoded.n) {
      fail('google_failed');
      return;
    }

    try {
      const profile = await this.google.exchangeCode(code);
      const { tokens } = await this.auth.loginWithGoogle(profile);
      this.setRefreshCookie(res, tokens.refreshToken);
    } catch {
      fail('google_failed');
      return;
    }

    // La cookie de refresco ya está fijada; el frontend rehidrata vía /auth/refresh.
    const localePath = decoded.l === 'en' ? '/en' : '';
    res.redirect(`${this.webOrigin()}${localePath}/account`);
  }

  private webOrigin(): string {
    return this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
  }

  private setRefreshCookie(res: Response, token: string): void {
    const options: CookieOptions = {
      httpOnly: true,
      // Strict: la cookie no viaja en peticiones cross-site (mitiga CSRF).
      sameSite: 'strict',
      // En producción siempre HTTPS; en local HTTP es aceptable (ver SECURITY).
      secure: process.env.NODE_ENV === 'production',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    };
    res.cookie(REFRESH_COOKIE_NAME, token, options);
  }
}
