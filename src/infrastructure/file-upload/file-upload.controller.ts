import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request, Response } from 'express';
import { FileUploadService } from './file-upload.service';

// MIME types permitidos por categoría
const ALLOWED_MIME_TYPES = [
  // Imágenes
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Videos
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-flv',
  'video/x-m4v',
  'video/webm',
  'video/x-ms-wmv',
  // Audios
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/x-m4a',
  'audio/webm',
  'audio/x-wav',
  'audio/x-aiff',
];

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB (videos/audios largos)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB (imágenes)

@Controller('file-upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  // Subida de un solo archivo (GridFS)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new Error('Tipo de archivo no permitido (imagen, video o audio)'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    try {
      if (
        IMAGE_MIME_TYPES.includes(file.mimetype) &&
        file.size > MAX_IMAGE_SIZE
      ) {
        return {
          message: 'Las imágenes no pueden superar los 5MB',
          error: 'too_large',
        };
      }

      const fileId = await this.fileUploadService.uploadFile(file);

      return {
        message: 'El archivo se ha cargado exitosamente',
        fileId,
        url: `/file-upload/stream/${fileId}`,
      };
    } catch (error) {
      return {
        message: 'Error al cargar el archivo',
        error: error.message,
      };
    }
  }

  // Subida de múltiples archivos (GridFS)
  @Post('uploadMultiple')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new Error('Tipo de archivo no permitido (imagen, video o audio)'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    try {
      const fileIds = await Promise.all(
        files.map((f) => this.fileUploadService.uploadFile(f)),
      );

      return {
        message: 'Files uploaded successfully',
        fileIds,
        urls: fileIds.map((id) => `/file-upload/stream/${id}`),
      };
    } catch (error) {
      return {
        message: 'Error uploading files',
        error: error.message,
      };
    }
  }

  @Get('stream/:fileId')
  async getFile(
    @Param('fileId') fileId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const meta = await this.fileUploadService.getFileMetadata(fileId);
    if (!meta) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const size = meta.length;
    const contentType = meta.contentType || 'application/octet-stream';
    const range = req.headers.range;

    // Soporte HTTP Range (necesario para seek/reproducción de video en web y mobile)
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : size - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
        });
        const stream = await this.fileUploadService.getFileStreamRange(
          fileId,
          start,
          end + 1,
        );
        stream.pipe(res);
        return;
      }
    }

    res.writeHead(200, {
      'Content-Length': size,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    const stream = await this.fileUploadService.getFileStream(fileId);
    stream.pipe(res);
  }
}
