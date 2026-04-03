import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import { Model } from 'mongoose';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { Participant } from './schemas/participant.schema';

@Injectable()
export class ParticipantService {
  constructor(
    @InjectModel(Participant.name)
    private participantModel: Model<Participant>,
  ) { }

  async create(createParticipantDto: CreateParticipantDto) {
    const existingParticipant = await this.participantModel.findOne({
      nit: createParticipantDto.nit,
    });
    if (existingParticipant) {
      throw new Error('A participant with that nit already exists');
    }

    const participant = new this.participantModel(createParticipantDto);
    return participant.save();
  }

  async createMany(file: Express.Multer.File) {
    const fileContent = readFileSync(file.path, 'utf8');
    const participantsData = await parse(fileContent, { columns: true });
    const participants = [];

    for await (const row of participantsData) {
      participants.push({
        name: row['name'],
        nit: row['nit'],
        epsCode: row['epsCode'],
        address: row['address'],
        phoneNumber: row['phoneNumber'],
        email: row['email'],
        createdAt: new Date(Date.now()),
        createdBy: row['createdBy'],
        managerData: {
          name: row['managerName'],
          document: row['managerDocument'],
          documentType: row['managerDocumentType'],
          email: row['managerEmail'],
          phoneNumber: row['managerPhoneNumber'],
        },
        overdueInvoiceIds: [''],
        totalDebt: 0,
        daysInArrears: 0,
        creditLimit: 0,
        avatar: '03.jpg',
      });
    }

    return this.participantModel.insertMany(participants);
  }

  async findAll(query: any) {
    const { rows, page, dateFilter, limit } = query;
    const filter: any = {};

    if (dateFilter) {
      filter.createdAt = {};
      if (dateFilter.startDate) {
        filter.createdAt.$gte = dateFilter.startDate;
      }
      if (dateFilter.endDate) {
        filter.createdAt.$lte = dateFilter.endDate;
      }
    }

    const recordLimit = limit ? parseInt(limit) : rows ? parseInt(rows) : 10;
    const skip = rows && page ? recordLimit * (parseInt(page) - 1) : 0;

    return {
      participants: await this.participantModel
        .find(filter)
        .skip(skip)
        .limit(recordLimit)
        .sort({ name: 1 }),
      count: await this.participantModel.countDocuments(filter),
    };
  }

  async getCountAll(query: any) {
    return this.participantModel.countDocuments(query).exec();
  }

  async search(searchTerm: string) {
    const regex = new RegExp(searchTerm, 'i');
    const query = {
      $or: [
        { name: { $regex: regex } },
        { nit: { $regex: regex } },
        { address: { $regex: regex } },
        { phoneNumber: { $regex: regex } },
        { email: { $regex: regex } },
      ],
    };

    return this.participantModel
      .find(searchTerm === 'all' ? {} : query)
      .sort({ name: -1 });
  }

  async findOne(id: string) {
    return this.participantModel.findById(id);
  }

  async update(updateParticipantDto: UpdateParticipantDto) {
    const participant = await this.participantModel.findById(
      updateParticipantDto._id,
    );
    if (!participant) {
      throw new Error('Participant not found');
    }

    Object.assign(participant, updateParticipantDto);
    participant.editedAt = new Date(Date.now());
    return participant.save();
  }

  async remove(id: string) {
    return this.participantModel.findByIdAndDelete(id);
  }
}

