import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { NotificationType } from './schemas/notificationType.schema';
import { CreateNotificationTypeDto } from './dto/create-notificationType.dto';
import { UpdateNotificationTypeDto } from './dto/update-notificationType.dto';

@Injectable()
export class NotificationTypeService {
    constructor(
        @InjectModel(NotificationType.name)
        private notificationTypeModel: Model<NotificationType>,
    ) { }

    async create(createNotificationTypeDto: CreateNotificationTypeDto) {
        const existing = await this.notificationTypeModel.findOne({
            title: createNotificationTypeDto.title,
        });

        if (existing) {
            throw new Error('Ya existe un tipo de notificación con ese título');
        }

        const created = new this.notificationTypeModel({
            ...createNotificationTypeDto,
            createdAt: new Date(),
        });

        return created.save();
    }

    async bulkCreate(file: Express.Multer.File) {
        const stream = Readable.from(file.buffer.toString());
        const parser = stream.pipe(parse({ columns: true }));
        const notificationTypes: NotificationType[] = [];

        for await (const row of parser) {
            const exists = await this.notificationTypeModel.findOne({
                title: row['NotificationType'],
            });

            if (!exists) {
                notificationTypes.push({
                    title: row['NotificationType'],
                    description: row['Description'],
                    createdAt: new Date(row['Date']),
                    createdBy: 'Yovany Suarez Silva',

                } as NotificationType);
            }
        }

        if (notificationTypes.length > 0) {
            await this.notificationTypeModel.insertMany(notificationTypes);
        }

        return { message: 'Tipos de notificación creados exitosamente' };
    }

    async findAll() {
        return this.notificationTypeModel.find().exec();
    }

    async findOne(id: string) {
        return this.notificationTypeModel.findById(id).exec();
    }

    async update(id: string, updateNotificationTypeDto: UpdateNotificationTypeDto) {
        const existing = await this.notificationTypeModel.findById(id).exec();

        if (!existing) {
            throw new Error('Tipo de notificación no encontrado');
        }

        existing.set({
            ...updateNotificationTypeDto,
            editedAt: new Date(),
            editedBy: 'Yovany Suarez Silva',
        });

        return existing.save();
    }

    async remove(id: string) {
        const result = await this.notificationTypeModel.findByIdAndDelete(id).exec();

        if (!result) {
            throw new Error('Tipo de notificación no encontrado');
        }

        return result;
    }
}