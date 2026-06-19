import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { PublicUser, toPublicUser } from '../users/user.mapper';
import { BCRYPT_ROUNDS, REFRESH_TOKEN_EXPIRES_IN } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

interface AccessPayload {
  sub: string;
  email: string;
  type: 'access';
}

interface RefreshPayload {
  sub: string;
  type: 'refresh';
}

const INVALID_CREDENTIALS = 'Credenciales inválidas';
const INVALID_REFRESH = 'Token de refresco inválido o caducado';

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Ese email ya está registrado');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.prisma.user.create({
        data: { email, passwordHash, name: dto.name.trim(), locale: dto.locale ?? 'es' },
      });
      return { user: toPublicUser(user), tokens: await this.issueTokens(user.id, user.email) };
    } catch (error) {
      // Condición de carrera sobre el índice único de email.
      if (isUniqueViolation(error)) {
        throw new ConflictException('Ese email ya está registrado');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Mensaje idéntico en todos los casos para no revelar si el email
    // existe (anti-enumeración). Usuarios dados de baja o solo-OAuth
    // (sin contraseña local) tampoco pueden entrar por aquí.
    if (!user || user.deletedAt || !user.passwordHash) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return { user: toPublicUser(user), tokens: await this.issueTokens(user.id, user.email) };
  }

  /** Verifica el refresh token de la cookie y emite tokens nuevos (rotación). */
  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(INVALID_REFRESH);
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException(INVALID_REFRESH);
    }
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });
    if (!user) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }
    return { user: toPublicUser(user), tokens: await this.issueTokens(user.id, user.email) };
  }

  private async issueTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessPayload: AccessPayload = { sub: userId, email, type: 'access' };
    const refreshPayload: RefreshPayload = { sub: userId, type: 'refresh' };
    const [accessToken, refreshToken] = await Promise.all([
      // Secreto y expiración del access token configurados en JwtModule.
      this.jwt.signAsync({ ...accessPayload }),
      this.jwt.signAsync(
        { ...refreshPayload },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: REFRESH_TOKEN_EXPIRES_IN,
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }
}
