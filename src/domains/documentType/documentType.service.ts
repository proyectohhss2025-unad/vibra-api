import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentType } from './schemas/documentType.model';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';

@Injectable()
export class DocumentTypeService {
  constructor(
    @InjectModel(DocumentType.name)
    private readonly documentTypeModel: Model<DocumentType>,
  ) { }

  async create(createDocumentTypeDto: CreateDocumentTypeDto): Promise<DocumentType> {
    const { name } = createDocumentTypeDto;
    const existing = await this.documentTypeModel.findOne({ name, deleted: false });

    if (existing) {
      throw new ConflictException('A document type with that name already exists');
    }

    const documentType = new this.documentTypeModel(createDocumentTypeDto);
    return documentType.save();
  }

  async update(updateDocumentTypeDto: UpdateDocumentTypeDto): Promise<DocumentType> {
    const { _id, ...updateData } = updateDocumentTypeDto;
    const documentType = await this.documentTypeModel.findByIdAndUpdate(
      _id,
      { ...updateData, editedAt: new Date() },
      { new: true },
    );

    if (!documentType) {
      throw new NotFoundException('Document type not found');
    }

    return documentType;
  }

  async findAll(): Promise<DocumentType[]> {
    return this.documentTypeModel.find({ deleted: false }).exec();
  }

  async findOne(id: string): Promise<DocumentType> {
    const documentType = await this.documentTypeModel.findById(id).exec();
    if (!documentType || documentType.deleted) {
      throw new NotFoundException('Document type not found');
    }
    return documentType;
  }

  async findByName(name: string): Promise<DocumentType> {
    const documentType = await this.documentTypeModel.findOne({ name, deleted: false }).exec();
    if (!documentType) {
      throw new NotFoundException('Document type not found');
    }
    return documentType;
  }

  async remove(id: string, deletedBy: string): Promise<DocumentType> {
    const documentType = await this.documentTypeModel.findByIdAndUpdate(
      id,
      { deleted: true, deletedAt: new Date(), deletedBy },
      { new: true },
    );

    if (!documentType) {
      throw new NotFoundException('Document type not found');
    }

    return documentType;
  }

  async getCountAll(query: any): Promise<{ count: number }> {
    const count = await this.documentTypeModel.countDocuments({ ...query, deleted: false });
    return { count };
  }
}
