import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicUser, toPublicUser } from '../../users/user.mapper';

interface JwtPayload {
  sub: string;
  email: string;
  type?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Se ejecuta con el token ya verificado. Cargamos el usuario de BD en
   * cada petición: así una baja (deleted_at) invalida el acceso de
   * inmediato aunque el access token siga sin caducar.
   */
  async validate(payload: JwtPayload): Promise<PublicUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return toPublicUser(user);
  }
}
