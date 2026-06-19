import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PublicUser } from '../../users/user.mapper';

/** Inyecta el usuario autenticado (poblado por JwtStrategy.validate). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PublicUser => {
    const request = ctx.switchToHttp().getRequest<{ user: PublicUser }>();
    return request.user;
  },
);
