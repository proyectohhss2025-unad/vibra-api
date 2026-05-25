import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { CreateContactDto, UpdateContactDto } from './dto/create-contact.dto';
import { Contact } from './schemas/contact.schema';

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<Contact>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.log('ContactsService initialized');
  }

  async create(createContactDto: CreateContactDto): Promise<Contact> {
    this.logger.log(`Creating new contact message from ${createContactDto.email}`);
    const created = new this.contactModel({
      ...createContactDto,
      status: 'unread',
    });
    return created.save();
  }

  async findAll(): Promise<Contact[]> {
    this.logger.log('Fetching all contact messages');
    return this.contactModel.find().sort({ createdAt: -1 }).exec();
  }

  async findAllPaginate(
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<{ data: Contact[]; total: number }> {
    this.logger.log(`Fetching contact messages page=${page} limit=${limit} status=${status || 'all'}`);

    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = (page - 1) * limit;
    const data = await this.contactModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
    const total = await this.contactModel.countDocuments(filter).exec();
    return { data, total };
  }

  async findById(id: string): Promise<Contact> {
    this.logger.log(`Finding contact message by _id: ${id}`);
    const contact = await this.contactModel.findById(id).exec();
    if (!contact) {
      throw new NotFoundException(`Mensaje de contacto con id ${id} no encontrado`);
    }
    return contact;
  }

  async update(updateContactDto: UpdateContactDto): Promise<Contact> {
    this.logger.log(`Updating contact message ${updateContactDto._id}...`);

    const setFields: any = {};
    if (updateContactDto.status !== undefined) {
      setFields.status = updateContactDto.status;
      if (updateContactDto.status === 'read' || updateContactDto.status === 'in_progress') {
        setFields.readAt = new Date();
      }
      if (updateContactDto.status === 'resolved') {
        setFields.resolvedAt = new Date();
      }
    }
    if (updateContactDto.notes !== undefined) {
      setFields.notes = updateContactDto.notes;
    }

    const updated = await this.contactModel
      .findByIdAndUpdate(
        updateContactDto._id,
        { $set: setFields },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Mensaje de contacto con id ${updateContactDto._id} no encontrado`);
    }
    return updated;
  }

  async getStats(): Promise<{
    total: number;
    unread: number;
    in_progress: number;
    resolved: number;
    spam: number;
  }> {
    this.logger.log('Fetching contact stats');
    const [total, unread, inProgress, resolved, spam] = await Promise.all([
      this.contactModel.countDocuments().exec(),
      this.contactModel.countDocuments({ status: 'unread' }).exec(),
      this.contactModel.countDocuments({ status: 'in_progress' }).exec(),
      this.contactModel.countDocuments({ status: 'resolved' }).exec(),
      this.contactModel.countDocuments({ status: 'spam' }).exec(),
    ]);
    return { total, unread, in_progress: inProgress, resolved, spam };
  }
}
