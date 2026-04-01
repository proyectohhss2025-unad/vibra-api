import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateNotificationChannelDto } from './dto/create-notification-channel.dto';
import { UpdateNotificationChannelDto } from './dto/update-notification-channel.dto';
import { NotificationChannel } from './schemas/notificationChannel.schema';

@Injectable()
export class NotificationChannelService {
  constructor(
    @InjectModel(NotificationChannel.name)
    private notificationChannelModel: Model<NotificationChannel>,
  ) {}

  async create(createNotificationChannelDto: CreateNotificationChannelDto) {
    const existingChannel = await this.notificationChannelModel.findOne({
      title: createNotificationChannelDto.title,
    });

    if (existingChannel) {
      throw new Error('Ya existe un canal de notificación con ese título');
    }

    const createdChannel = new this.notificationChannelModel({
      ...createNotificationChannelDto,
      createdAt: new Date(),
      createdBy: 'Yovany Suarez Silva',
    });

    return createdChannel.save();
  }

  async findAll() {
    return this.notificationChannelModel.find().exec();
  }

  async findOne(id: string) {
    const channel = await this.notificationChannelModel.findById(id).exec();
    if (!channel) {
      throw new Error('Canal de notificación no encontrado');
    }
    return channel;
  }

  async findByTitle(title: string) {
    const channel = await this.notificationChannelModel
      .findOne({ title })
      .exec();
    if (!channel) {
      throw new Error('Canal de notificación no encontrado');
    }
    return channel;
  }

  async update(
    id: string,
    updateNotificationChannelDto: UpdateNotificationChannelDto,
  ) {
    const channel = await this.notificationChannelModel.findById(id).exec();
    if (!channel) {
      throw new Error('Canal de notificación no encontrado');
    }

    channel.description = updateNotificationChannelDto.description;
    channel.level = updateNotificationChannelDto.level;
    channel.editedAt = new Date();
    channel.editedBy = 'Yovany Suarez Silva';

    return channel.save();
  }

  async remove(id: string) {
    const channel = await this.notificationChannelModel
      .findByIdAndDelete(id)
      .exec();
    if (!channel) {
      throw new Error('Canal de notificación no encontrado');
    }
    return channel;
  }

  async createMany(
    createNotificationChannelDtos: CreateNotificationChannelDto[],
  ) {
    const channelsToCreate = createNotificationChannelDtos.map((dto) => ({
      ...dto,
      createdAt: new Date(),
      createdBy: 'Yovany Suarez Silva',
    }));

    return this.notificationChannelModel.insertMany(channelsToCreate);
  }
}
