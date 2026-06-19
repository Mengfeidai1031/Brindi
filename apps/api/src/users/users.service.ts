import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PublicUser, toPublicUser } from './user.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateMe(userId: string, dto: UpdateUserDto): Promise<PublicUser> {
    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.locale !== undefined) {
      data.locale = dto.locale;
    }
    if (dto.paymentLink !== undefined) {
      // null borra el enlace de pago (es opcional y editable por diseño).
      data.paymentLink = dto.paymentLink;
    }
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return toPublicUser(user);
  }

  /**
   * Baja lógica: marca deleted_at. Los guards y el login filtran por
   * deleted_at IS NULL, así que el acceso queda invalidado de inmediato.
   */
  async softDeleteMe(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  }
}
