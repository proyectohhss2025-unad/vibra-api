import {
    Controller,
    Get,
    Param,
    Post,
    Res,
    UploadedFile,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileUploadService } from './file-upload.service';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';

@Controller('file-upload')
export class FileUploadController {
    constructor(
        private readonly fileUploadService: FileUploadService
    ) { }

    // Filtro para videos y audios
    private fileFilter(req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void): any {
        // Lista de MIME types permitidos para videos y audios
        const allowedMIMETypes = [
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
            'audio/x-aiff'
        ];

        // Verificar si el MIME type está permitido
        if (allowedMIMETypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('El tipo de archivo no está permitido'), false);
        }
    }

    /*@Post('upload')
    @UseInterceptors(FileInterceptor('file'), {
        storage: diskStorage({
            destination: (req, file, cb) => {
                cb(null, 'uploads/');
            },
            filename: (req, file, cb) => {
                cb(null, `${uuidv4()}-${file.originalname}`);
            },
        }),
        limits: {
            fileSize: 5 * 1024 * 1024, // 5 MB
        },
        fileFilter: this.fileFilter.bind(this)
    } as any)
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        const fileId = await this.fileUploadService.uploadFile(file);
        return { fileId };
    }*/

    // Subida de un solo archivo
    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (req, file, cb) => {
                cb(null, 'uploads/');
            },
            filename: (req, file, cb) => {
                cb(null, `${uuidv4()}-${file.originalname}`);
            },
        }),
        limits: {
            fileSize: 5 * 1024 * 1024, // 5 MB
        },
        fileFilter: (req, file, cb) => {
            const fileExtensionPattern = /\.(mp4|avi|mov|mpeg|mpeg)$/;
            if (!fileExtensionPattern.exec(file.originalname)) {
                return cb(new Error('Se permiten solo archivos de audio y video'), false);
            }
            cb(null, true);
        },
    }))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        try {
            const fileInfo = {
                filename: file.filename,
                originalname: file.originalname,
                path: file.path,
            };

            const result = await this.fileUploadService.saveFile(fileInfo);

            return {
                message: 'El archivo se ha cargado exitosamente',
                file: fileInfo,
                id: result._id
            };
        } catch (error) {
            return {
                message: 'Error al cargar el archivo',
                error: error.message
            };
        }
    }

    @Post('uploadMultiple')
    @UseInterceptors(FileInterceptor('files', {
        storage: diskStorage({
            destination: (req, file, cb) => {
                cb(null, 'uploads/');
            },
            filename: (req, file, cb) => {
                cb(null, `${uuidv4()}-${file.originalname}`);
            },
        }),
        limits: {
            fileSize: 5 * 1024 * 1024, // 5 MB
        },
        fileFilter: (req, file, cb) => {
            const fileExtensionPattern = /\.(mp4|avi|mov|mpeg|mpeg)$/;
            if (!fileExtensionPattern.exec(file.originalname)) {
                return cb(new Error('Se permiten solo archivos de audio y video'), false);
            }
            cb(null, true);
        },
    }))
    async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
        try {
            const filesInfo = files.map(file => ({
                filename: file.filename,
                originalname: file.originalname,
                path: file.path,
            }));

            // Guardar en MongoDB
            const result = await this.fileUploadService.saveFiles(filesInfo);

            return {
                message: 'Files uploaded successfully',
                files: filesInfo,
                ids: result.map(file => file._id)
            };
        } catch (error) {
            return {
                message: 'Error uploading files',
                error: error.message
            };
        }
    }

    @Get('stream/:fileId')
    async getFile(@Param('fileId') fileId: string, @Res() res: Response) {
        const stream = await this.fileUploadService.getFileStream(fileId);
        stream.pipe(res);
    }
}