import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import mongoose, { Connection } from 'mongoose';
import { Readable } from 'stream';
import { ImageCompressionService } from '../image-compression/image-compression.service';

@Injectable()
export class FileUploadService {
  private gridFSBucket: GridFSBucket;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly imageCompressionService: ImageCompressionService,
  ) {
    this.gridFSBucket = new GridFSBucket(this.connection.db);
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const readableStream = new Readable();
    readableStream.push(file?.buffer);
    readableStream.push(null);

    const uploadStream = this.gridFSBucket.openUploadStream(file?.originalname);
    readableStream.pipe(uploadStream);

    return new Promise((resolve, reject) => {
      uploadStream.on('finish', () => resolve(uploadStream.id.toString()));
      uploadStream.on('error', reject);
    });
  }

  /**
   * Sube una imagen de avatar a GridFS con compresión automática.
   * - Redimensiona a máx 500px
   * - Convierte a JPEG calidad 80%
   */
  async uploadAvatarImage(file: Express.Multer.File): Promise<string> {
    // Comprimir la imagen
    const compressed = await this.imageCompressionService.compressAvatar(
      file.buffer,
    );

    const readableStream = new Readable();
    readableStream.push(compressed);
    readableStream.push(null);

    const uploadStream = this.gridFSBucket.openUploadStream(
      `avatar-${Date.now()}.jpg`,
      { contentType: 'image/jpeg' },
    );
    readableStream.pipe(uploadStream);

    return new Promise((resolve, reject) => {
      uploadStream.on('finish', () => resolve(uploadStream.id.toString()));
      uploadStream.on('error', reject);
    });
  }

  async saveFile(fileInfo: any): Promise<any> {
    const fileSchema = new mongoose.Schema({
      filename: String,
      originalname: String,
      mimetype: String,
      path: String,
    });

    const File = this.connection.model('File', fileSchema);
    return await new File(fileInfo).save();
  }

  async saveFiles(filesInfo: any[]): Promise<any[]> {
    const fileSchema = new mongoose.Schema({
      filename: String,
      originalname: String,
      mimetype: String,
      path: String,
    });

    const File = this.connection.model('File', fileSchema);
    return await File.insertMany(filesInfo);
  }

  async getFileStream(fileId: string): Promise<Readable> {
    const objectId = new ObjectId(fileId);
    return this.gridFSBucket.openDownloadStream(objectId);
  }

  // ─── Imágenes permitidas ────────────────────────────────────────────────
  private readonly allowedImageMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  /**
   * Valida que un archivo sea una imagen con formato permitido.
   * Lanza BadRequestException si no es válido.
   */
  validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }
    if (!this.allowedImageMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Formato de imagen no permitido. Permitidos: ${this.allowedImageMimes.join(', ')}`,
      );
    }
    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      throw new BadRequestException('La imagen excede el tamaño máximo de 5MB');
    }
  }

  /**
   * Elimina un archivo de GridFS por su fileId.
   */
  async deleteFile(fileId: string): Promise<void> {
    const objectId = new ObjectId(fileId);
    await this.gridFSBucket.delete(objectId);
  }
}
