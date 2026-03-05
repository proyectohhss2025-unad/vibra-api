import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import { Model } from 'mongoose';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './schemas/client.schema';

@Injectable()
export class ClientService {
    constructor(
        @InjectModel(Client.name) private clientModel: Model<Client>,
    ) { }

    async create(createClientDto: CreateClientDto) {
        const existingClient = await this.clientModel.findOne({ nit: createClientDto.nit });
        if (existingClient) {
            throw new Error('A client with that nit already exists');
        }

        const client = new this.clientModel(createClientDto);
        return client.save();
    }

    async createMany(file: Express.Multer.File) {
        const fileContent = readFileSync(file.path, 'utf8');
        const clientsData = await parse(fileContent, { columns: true });
        const clients = [];

        for await (const row of clientsData) {
            clients.push({
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
                    phoneNumber: row['managerPhoneNumber']
                },
                overdueInvoiceIds: [''],
                totalDebt: 0,
                daysInArrears: 0,
                creditLimit: 0,
                avatar: '03.jpg'
            });
        }

        return this.clientModel.insertMany(clients);
    }

    async findAll(query: any) {
        const { rows, page, dateFilter, limit } = query;
        const filter: any = {};
        
        // Aplicar filtro de fechas si existe
        if (dateFilter) {
            filter.createdAt = {};
            if (dateFilter.startDate) {
                filter.createdAt.$gte = dateFilter.startDate;
            }
            if (dateFilter.endDate) {
                filter.createdAt.$lte = dateFilter.endDate;
            }
        }
        
        // Determinar el límite de registros
        const recordLimit = limit ? parseInt(limit) : (rows ? parseInt(rows) : 10);
        
        // Calcular el salto de registros para la paginación
        const skip = rows && page ? recordLimit * (parseInt(page) - 1) : 0;
        
        return {
            clients: await this.clientModel.find(filter)
                .skip(skip)
                .limit(recordLimit)
                .sort({ name: 1 }),
            count: await this.clientModel.countDocuments(filter)
        };
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

        return this.clientModel.find(searchTerm === 'all' ? {} : query).sort({ name: -1 });
    }

    async findOne(id: string) {
        return this.clientModel.findById(id);
    }

    async update(updateClientDto: UpdateClientDto) {
        const client = await this.clientModel.findById(updateClientDto._id);
        if (!client) {
            throw new Error('Client not found');
        }

        Object.assign(client, updateClientDto);
        client.editedAt = new Date(Date.now());
        return client.save();
    }

    async remove(id: string) {
        return this.clientModel.findByIdAndDelete(id);
    }
}