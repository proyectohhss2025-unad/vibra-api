import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class ImageCompressionService {
  /**
   * Comprime una imagen para usar como avatar.
   * - Redimensiona a máx 500px en cualquier dimensión
   * - Convierte a JPEG calidad 80%
   */
  async compressAvatar(buffer: Buffer): Promise<Buffer> {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Redimensionar si excede 500px en cualquier dimensión
    if ((metadata.width ?? 0) > 500 || (metadata.height ?? 0) > 500) {
      image.resize(500, 500, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convertir a JPEG calidad 80%
    return image.jpeg({ quality: 80 }).toBuffer();
  }
}
