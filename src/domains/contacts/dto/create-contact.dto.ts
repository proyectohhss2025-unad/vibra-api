import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ContactStatus } from '../schemas/contact.schema';

export class CreateContactDto {
  @ApiProperty({
    description: 'Nombre completo de la persona que contacta.',
    example: 'María García',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Correo electrónico de contacto.',
    example: 'maria@colegio.edu',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Asunto del mensaje.',
    example: 'Quiero implementar Vibra en mi institución',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  subject: string;

  @ApiProperty({
    description: 'Cuerpo del mensaje.',
    example: 'Hola, soy directora del Colegio Los Andes y estamos interesados...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;
}

export class UpdateContactDto {
  @ApiProperty({
    description: 'ID del mensaje (MongoDB _id).',
    example: '66c9cce47e6a95e98116c0ab',
  })
  @IsString()
  @IsNotEmpty()
  _id: string;

  @ApiPropertyOptional({
    description: 'Nuevo estado del mensaje.',
    enum: ['unread', 'read', 'in_progress', 'resolved', 'spam'],
    example: 'in_progress',
  })
  @IsOptional()
  @IsEnum(['unread', 'read', 'in_progress', 'resolved', 'spam'])
  status?: ContactStatus;

  @ApiPropertyOptional({
    description: 'Notas internas del administrador.',
    example: 'Contactar directamente al número 3001234567.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
