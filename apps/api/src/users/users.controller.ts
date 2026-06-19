import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from '../auth/auth.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { PublicUser } from './user.mapper';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido o caducado' })
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  @ApiOkResponse({ description: 'Datos públicos del usuario' })
  me(@CurrentUser() user: PublicUser): PublicUser {
    return user;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualiza nombre, idioma o enlace de pago' })
  @ApiOkResponse({ description: 'Usuario actualizado' })
  updateMe(@CurrentUser() user: PublicUser, @Body() dto: UpdateUserDto): Promise<PublicUser> {
    return this.users.updateMe(user.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Baja lógica de la cuenta (deleted_at)' })
  @ApiNoContentResponse({ description: 'Cuenta dada de baja; cookie de refresco eliminada' })
  async deleteMe(@CurrentUser() user: PublicUser, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.users.softDeleteMe(user.id);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }
}
