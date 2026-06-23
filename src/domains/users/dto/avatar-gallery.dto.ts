import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
} from 'class-validator';

export enum AvatarGalleryItemTypeEnum {
  PRESET = 'preset',
  UPLOAD = 'upload',
}

// ─── Response DTO (un item de la galería) ─────────────────────────────────
export class AvatarGalleryItemDto {
  @ApiProperty({
    description: 'UUID del item en la galería.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Tipo de avatar: preset (prediseñado) o upload (subido).',
    enum: AvatarGalleryItemTypeEnum,
    example: 'preset',
  })
  type: AvatarGalleryItemTypeEnum;

  @ApiProperty({
    description: 'Filename (preset) o fileId de GridFS (upload).',
    example: '03.jpg',
  })
  src: string;

  @ApiPropertyOptional({
    description: 'Nombre amigable del avatar.',
    example: 'Mi foto',
  })
  label?: string;

  @ApiProperty({ description: 'Fecha en que se agregó a la galería.' })
  addedAt: Date;
}

// ─── Response: GET /avatar/gallery ─────────────────────────────────────────
export class AvatarGalleryResponseDto {
  @ApiProperty({
    description: 'Lista de avatares en la galería del usuario.',
    type: [AvatarGalleryItemDto],
  })
  gallery: AvatarGalleryItemDto[];

  @ApiProperty({
    description: 'Valor actual del avatar activo (filename o fileId).',
    example: '03.jpg',
  })
  activeAvatar: string;
}

// ─── Request: POST /avatar/select ──────────────────────────────────────────
export class SelectAvatarDto {
  @ApiProperty({
    description: 'ID del item en avatarGallery a marcar como activo.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  galleryId: string;
}

// ─── Request: POST /avatar/upload (multipart) ─────────────────────────────
// (Se maneja con @UseInterceptors(FileInterceptor) en el controller,
// no requiere DTO separado, solo el file multipart.)

// ─── Request: DELETE /avatar/:galleryId ────────────────────────────────────
// (Se pasa galleryId como parámetro de ruta, no requiere DTO.)
