import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterTokenDto {
  @ApiProperty({
    description:
      'Expo Push Token (ExponentPushToken[xxxx]) o JSON de la suscripción Web Push para platform=web',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiPropertyOptional({
    description: 'Plataforma del dispositivo',
    example: 'android',
    enum: ['ios', 'android', 'web'],
  })
  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  platform?: 'ios' | 'android' | 'web';
}
