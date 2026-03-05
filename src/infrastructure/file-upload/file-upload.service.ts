import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import mongoose, { Connection } from 'mongoose';
import { Readable } from 'stream';

@Injectable()
export class FileUploadService {
    private gridFSBucket: GridFSBucket;

    constructor(@InjectConnection() private readonly connection: Connection) {
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
}