import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { Notification } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { generateSerial } from 'src/utils/string';
import {
  NOTIFICATION_CHANNEL_INBOX,
  NOTIFICATION_TYPE_ALERT,
  NOTIFICATION_TYPE_INFO,
} from 'src/utils/constants';
import { NotificationType } from '../notificationType/schemas/notificationType.schema';
import { NotificationChannel } from '../notificationChannel/schemas/notificationChannel.schema';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @InjectModel(NotificationType.name)
    private notificationTypeModel: Model<NotificationType>,
    @InjectModel(NotificationChannel.name)
    private notificationChannelModel: Model<NotificationChannel>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const createdNotification = new this.notificationModel(
      createNotificationDto,
    );
    return createdNotification.save();
  }

  async createMany(createNotificationDtos: CreateNotificationDto[]) {
    return this.notificationModel.insertMany(createNotificationDtos);
  }

  async findAll(query: any) {
    return this.notificationModel.find(query).exec();
  }

  async findOne(id: string) {
    return this.notificationModel.findById(id).exec();
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto) {
    return this.notificationModel
      .findByIdAndUpdate(id, updateNotificationDto, { new: true })
      .exec();
  }

  async remove(id: string) {
    return this.notificationModel.findByIdAndDelete(id).exec();
  }

  /**
   * Create a general notification
   *
   * @param message - Notification message
   * @param title - Notification title
   * @param user - User object
   */
  async createGeneralNotification(
    message: string,
    title: string,
    user?: any,
  ): Promise<void> {
    const isExist = await this.notificationModel.findOne({ message });
    if (!isExist) {
      const count = await this.notificationModel.countDocuments();
      const serial = generateSerial(`${count}`);
      const notification = new this.notificationModel({
        serial,
        ID: ``,
        title,
        message,
        participant: null,
        notificationType: NOTIFICATION_TYPE_INFO,
        notificationChannel: NOTIFICATION_CHANNEL_INBOX,
        priority: 3,
        isRead: false,
        createdBy: user?.name,
        createdAt: new Date(),
      });

      await notification.save();
    }
  }

  async createNotification(title: string): Promise<void> {
    const count = await this.notificationModel.countDocuments();
    const serial = generateSerial(`${count}`);
    const notification = new this.notificationModel({
      serial,
      ID: ``,
      title,
      message: '',
      participant: '',
      notificationType: NOTIFICATION_TYPE_ALERT,
      notificationChannel: NOTIFICATION_CHANNEL_INBOX,
      priority: 2,
      isRead: false,
    });

    await notification.save();
  }

  async bulkCreate(file: Express.Multer.File) {
    const stream = Readable.from(file.buffer.toString());
    const parser = stream.pipe(parse({ columns: true }));
    const notifications = [];

    for await (const row of parser) {
      const user = await this.userModel.findOne({ username: row['user'] });
      const notificationType = await this.notificationTypeModel.findOne({
        title: row['notificationType'],
      });

      if (user && notificationType) {
        notifications.push({
          ID: row['ID'],
          title: row['title'],
          message: row['message'],
          isRead: row['isRead'],
          user: user._id,
          notificationType: notificationType._id,
          createdAt: new Date(),
          createdBy: row['createdBy'],
          priority: row['priority'],
          notificationChannel: row['notificationChannel'],
        });
      }
    }

    if (notifications.length > 0) {
      await this.notificationModel.insertMany(notifications);
    }

    return { message: 'Notificaciones creadas exitosamente' };
  }

  async getById(id: string) {
    return this.notificationModel
      .findById(id)
      .populate('user')
      .populate('notificationType')
      .populate('notificationChannel')
      .exec();
  }

  async getByTitle(title: string) {
    return this.notificationModel
      .findOne({ title })
      .populate('user')
      .populate('notificationType')
      .populate('notificationChannel')
      .exec();
  }

  async getCountAll(query: any) {
    return this.notificationModel.countDocuments(query).exec();
  }

  async getCountAllByDay(query: any) {
    return this.notificationModel.countDocuments(query).exec();
  }

  async getAll(query: any) {
    return this.notificationModel
      .find(query)
      .populate('user')
      .populate('notificationType')
      .populate('notificationChannel')
      .skip(query.rows * (parseInt(query.page) - 1))
      .limit(parseInt(query.rows))
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAllByTitle(title: string, isRead: boolean, query: any) {
    return this.notificationModel
      .find({ title, isRead })
      .populate('notificationType')
      .skip(query.rows * (parseInt(query.page) - 1))
      .limit(parseInt(query.rows))
      .sort({ createdAt: -1 })
      .exec();
  }

  async search(searchTerm: string) {
    const regex = new RegExp(searchTerm, 'i');
    return this.notificationModel
      .find({
        $or: [
          { ID: { $regex: regex } },
          { title: { $regex: regex } },
          { message: { $regex: regex } },
          { createdBy: { $regex: regex } },
          { editedBy: { $regex: regex } },
        ],
      })
      .populate('notificationType')
      .exec();
  }

  async markAsRead(id: string, editedBy: string) {
    const notification = await this.notificationModel.findById(id);
    if (!notification) {
      throw new Error('Notificación no encontrada');
    }

    notification.isRead = true;
    notification.editedAt = new Date();
    notification.editedBy = editedBy;

    return notification.save();
  }
}
