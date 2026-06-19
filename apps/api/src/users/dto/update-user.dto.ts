import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'María G.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: ['es', 'en'] })
  @IsOptional()
  @IsIn(['es', 'en'])
  locale?: string;

  @ApiPropertyOptional({
    description: 'Enlace de pago propio (paypal.me, etc.). Envía null para borrarlo.',
    example: 'https://paypal.me/maria',
    nullable: true,
  })
  @IsOptional()
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'paymentLink debe ser una URL https válida' },
  )
  @MaxLength(255)
  paymentLink?: string | null;
}
