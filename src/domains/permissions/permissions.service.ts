import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from './schemas/permission.schema';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,
  ) {}

  async findAll(): Promise<Permission[]> {
    return this.permissionModel.find().populate('permissionCategory').exec();
  }

  async findOne(id: string): Promise<Permission> {
    return this.permissionModel
      .findById(id)
      .populate('permissionCategory')
      .exec();
  }

  async create(permission: Partial<Permission>): Promise<Permission> {
    const newPermission = new this.permissionModel(permission);
    return newPermission.save();
  }

  async update(
    id: string,
    permission: Partial<Permission>,
  ): Promise<Permission> {
    return this.permissionModel
      .findByIdAndUpdate(id, permission, { new: true })
      .exec();
  }

  async remove(id: string): Promise<Permission> {
    return this.permissionModel.findByIdAndDelete(id).exec();
  }

  async search(searchTerm: string): Promise<Partial<Permission>[]> {
    if (!searchTerm || searchTerm === 'all') {
      return this.permissionModel
        .find()
        .limit(20)
        .sort({ createdAt: -1 })
        .exec();
    }
    const regex = new RegExp(searchTerm, 'i');
    return this.permissionModel
      .find({
        $or: [
          { name: { $regex: regex } },
          { description: { $regex: regex } },
          { serial: { $regex: regex } },
          { event: { $regex: regex } },
        ],
      })
      .limit(20)
      .sort({ createdAt: -1 })
      .exec();
  }
}
