import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PermissionCategory, PermissionCategoryDocument } from './schemas/permissionCategory.schema';

@Injectable()
export class PermissionCategoryService {
  constructor(
    @InjectModel(PermissionCategory.name)
    private categoryModel: Model<PermissionCategoryDocument>,
  ) {}

  async findAll(): Promise<PermissionCategory[]> {
    return this.categoryModel.find({ deleted: { $ne: true } }).exec();
  }
}
