import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { parse } from 'csv-parse';
import { Model } from 'mongoose';
import {
  NOTIFICATION_CHANNEL_INBOX,
  NOTIFICATION_TYPE_ALERT,
  NOTIFICATION_TYPE_INFO,
} from 'src/utils/constants';
import { generateSerial } from 'src/utils/string';
import { Readable } from 'stream';
import { getColombiaDayRange } from '../../utils/dates';
import { NotificationChannel } from '../notificationChannel/schemas/notificationChannel.schema';
import { NotificationType } from '../notificationType/schemas/notificationType.schema';
import { Role } from '../roles/schemas/role.schema';
import { User } from '../users/schemas/user.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification } from './schemas/notification.schema';

export interface SystemNotificationPayload {
  title: string;
  message: string;
  event?: string;
  priority?: number;
  createdBy?: string;
  action?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

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
    @InjectModel(Role.name) private roleModel: Model<Role>,
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

  async update(
    id: string,
    updateNotificationDto: UpdateNotificationDto,
    userId?: string,
    isSuperAdmin = false,
  ) {
    const notification = await this.notificationModel.findById(id).exec();
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    this.assertNotificationAccess(notification, userId, isSuperAdmin);
    return this.notificationModel
      .findByIdAndUpdate(id, updateNotificationDto, { new: true })
      .exec();
  }

  async remove(id: string, userId?: string, isSuperAdmin = false) {
    const notification = await this.notificationModel.findById(id).exec();
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    this.assertNotificationAccess(notification, userId, isSuperAdmin);
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
    const isExist = await this.notificationModel.findOne({
      message,
      deleted: { $ne: true },
    });
    if (!isExist) {
      const count = await this.notificationModel.countDocuments();
      const serial = generateSerial(`${count}`);
      const notification = new this.notificationModel({
        serial,
        ID: ``,
        title,
        message,
        participant: null,
        user: user?._id || user?.id || (typeof user === 'string' ? user : null),
        notificationType: NOTIFICATION_TYPE_INFO,
        notificationChannel: NOTIFICATION_CHANNEL_INBOX,
        priority: 3,
        isRead: false,
        isActive: true,
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

  /**
   * Crea una notificación de sistema general (sin usuario específico) en la bandeja.
   *
   * Si se envía `event`, se usa como clave de idempotencia: si ya existe una
   * notificación general con ese valor, no se duplica.
   */
  async createSystemNotification(
    params: SystemNotificationPayload,
  ): Promise<any> {
    const result = await this.upsertSystemNotification(null, params);
    return result.notification;
  }

  /**
   * Crea una notificación de sistema por cada usuario activo cuyo rol esté en
   * `roles` (p. ej. Super Admin, Administrador, Docente).
   *
   * La idempotencia por `event` es por usuario: el mismo aviso semanal no se
   * duplica para un destinatario, pero sí se crea para cada uno.
   */
  async createSystemNotificationsForRoles(
    params: SystemNotificationPayload & { roles: string[] },
  ): Promise<{ created: number; existing: number; recipients: string[] }> {
    const { roles, ...payload } = params;

    const roleDocs = await this.roleModel
      .find({
        name: { $in: roles },
        isActive: { $ne: false },
        deleted: { $ne: true },
      })
      .select('_id')
      .lean()
      .exec();

    const roleIds = roleDocs.map((role: any) => role._id);
    if (roleIds.length === 0) {
      return { created: 0, existing: 0, recipients: [] };
    }

    const users = await this.userModel
      .find({
        role: { $in: roleIds },
        isActive: true,
        deleted: { $ne: true },
      })
      .select('_id')
      .lean()
      .exec();

    const recipients = users.map((user: any) => String(user._id));
    let created = 0;
    let existing = 0;

    for (const userId of recipients) {
      const result = await this.upsertSystemNotification(userId, payload);
      if (result.created) created++;
      else existing++;
    }

    return { created, existing, recipients };
  }

  /**
   * Crea o actualiza una notificación de sistema para un destinatario.
   * `user = null` representa una notificación general.
   */
  private async upsertSystemNotification(
    user: string | null,
    params: SystemNotificationPayload,
  ): Promise<{ notification: any; created: boolean }> {
    const {
      title,
      message,
      event,
      priority = 2,
      createdBy = 'Sistema',
      action,
      actionLabel,
      metadata,
    } = params;

    if (event) {
      const filter: any = { event, deleted: { $ne: true } };
      if (user) filter.user = user;
      else filter.user = null;

      const existing = await this.notificationModel.findOne(filter).exec();
      if (existing) {
        // Mantener actualizadas las acciones de avisos creados antes de que
        // existieran estos campos (misma clave de idempotencia).
        const metadataChanged =
          metadata !== undefined &&
          JSON.stringify(existing.metadata ?? {}) !== JSON.stringify(metadata);
        const actionChanged =
          action !== undefined && existing.action !== action;
        const labelChanged =
          actionLabel !== undefined && existing.actionLabel !== actionLabel;

        if (metadataChanged || actionChanged || labelChanged) {
          if (action !== undefined) existing.action = action;
          if (actionLabel !== undefined) existing.actionLabel = actionLabel;
          if (metadata !== undefined) existing.metadata = metadata;
          await existing.save();
        }
        return { notification: existing, created: false };
      }
    }

    const count = await this.notificationModel.countDocuments();
    const serial = generateSerial(`${count}`);
    const notification = new this.notificationModel({
      serial,
      ID: '',
      title,
      message,
      user,
      notificationType: NOTIFICATION_TYPE_ALERT,
      notificationChannel: NOTIFICATION_CHANNEL_INBOX,
      priority,
      isRead: false,
      isActive: true,
      event,
      action,
      actionLabel,
      metadata,
      createdBy,
    });

    await notification.save();
    return { notification, created: true };
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

  async getById(id: string, userId?: string, isSuperAdmin = false) {
    const notification = await this.notificationModel
      .findById(id)
      .populate('user')
      .populate('notificationType')
      .populate('notificationChannel')
      .exec();
    this.assertNotificationAccess(notification, userId, isSuperAdmin);
    return notification;
  }

  async getByTitle(title: string, userId?: string) {
    return this.notificationModel
      .findOne({
        title,
        user: userId ? userId : { $in: [] },
        deleted: { $ne: true },
      })
      .populate('user')
      .populate('notificationType')
      .populate('notificationChannel')
      .exec();
  }

  /**
   * Construye el filtro de notificaciones del usuario autenticado.
   * Si no hay `userId`, devuelve un filtro que no coincide con nada para no
   * exponer notificaciones de otros usuarios.
   */
  private buildUserFilter(query: any = {}, userId?: string): any {
    const filter: any = { ...(query || {}) };
    delete filter.page;
    delete filter.rows;
    delete filter.user;
    filter.user = userId ? userId : { $in: [] };
    if (filter.isActive === undefined) filter.isActive = { $ne: false };
    filter.deleted = { $ne: true };
    return filter;
  }

  /**
   * Verifica que el usuario autenticado pueda acceder a la notificación.
   * Las notificaciones generales (`user: null`) sólo las gestiona SuperAdmin.
   */
  private assertNotificationAccess(
    notification: any,
    userId?: string,
    isSuperAdmin = false,
  ): void {
    if (!notification) return;

    const owner = notification.user?._id ?? notification.user;
    if (!owner) {
      if (!isSuperAdmin) {
        throw new ForbiddenException(
          'No puedes acceder a una notificación general',
        );
      }
      return;
    }

    if ((!userId || String(owner) !== String(userId)) && !isSuperAdmin) {
      throw new ForbiddenException(
        'No puedes acceder a la notificación de otro usuario',
      );
    }
  }

  async getCountAll(query: any, userId?: string) {
    const filter = this.buildUserFilter(query, userId);
    const count = await this.notificationModel.countDocuments(filter).exec();
    return { countNotifications: count, count };
  }

  async getCountAllByDay(query: any, userId?: string) {
    const { start, end } = getColombiaDayRange();
    const filter = this.buildUserFilter(query, userId);
    filter.createdAt = { $gte: start, $lte: end };
    const count = await this.notificationModel.countDocuments(filter).exec();
    return { countNotifications: count, count };
  }

  async getAll(query: any, userId?: string) {
    const { page = 1, rows = 10, ...filters } = query;
    const skip = (parseInt(page as string) - 1) * parseInt(rows as string);
    const limit = parseInt(rows as string);
    const filter = this.buildUserFilter(filters, userId);

    const notifications = await this.notificationModel
      .find(filter)
      .populate('user', '-password')
      .populate('notificationType')
      .populate('notificationChannel')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    const count = await this.notificationModel.countDocuments(filter);

    return { notifications, length: count };
  }

  async getAllByTitle(
    title: string,
    isRead: boolean,
    query: any,
    userId?: string,
  ) {
    const filter = this.buildUserFilter({ title, isRead }, userId);
    return this.notificationModel
      .find(filter)
      .populate('notificationType')
      .skip(query.rows * (parseInt(query.page) - 1))
      .limit(parseInt(query.rows))
      .sort({ createdAt: -1 })
      .exec();
  }

  async search(searchTerm: string, userId?: string) {
    const regex = new RegExp(searchTerm, 'i');
    const filter = this.buildUserFilter(
      {
        $or: [
          { ID: { $regex: regex } },
          { title: { $regex: regex } },
          { message: { $regex: regex } },
          { createdBy: { $regex: regex } },
          { editedBy: { $regex: regex } },
        ],
      },
      userId,
    );
    return this.notificationModel
      .find(filter)
      .populate('notificationType')
      .exec();
  }

  async markAsRead(
    id: string,
    editedBy: string,
    userId?: string,
    isSuperAdmin = false,
  ) {
    const notification = await this.notificationModel.findById(id);
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    this.assertNotificationAccess(notification, userId, isSuperAdmin);

    notification.isRead = true;
    notification.editedAt = new Date();
    notification.editedBy = editedBy;

    return notification.save();
  }

  async getUnreadCountByUserId(id: string): Promise<number> {
    return this.notificationModel.countDocuments({
      user: id,
      isRead: false,
      isActive: { $ne: false },
      deleted: { $ne: true },
    });
  }
}
