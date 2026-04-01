import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserPermission } from './schemas/userPermission.schema';

@Injectable()
export class UserPermissionsService {
  constructor(
    @InjectModel(UserPermission.name)
    private userPermissionModel: Model<UserPermission>,
  ) {}

  async findAll(): Promise<UserPermission[]> {
    return this.userPermissionModel.find().exec();
  }

  async findOne(id: string): Promise<UserPermission> {
    return this.userPermissionModel.findById(id).exec();
  }

  async findByUser(userId: string): Promise<UserPermission[]> {
    return this.userPermissionModel
      .find({ user: new Types.ObjectId(userId) })
      .exec();
  }

  async findByPermission(permissionId: string): Promise<UserPermission[]> {
    return this.userPermissionModel
      .find({ permission: new Types.ObjectId(permissionId) })
      .exec();
  }

  async create(
    userPermission: Partial<UserPermission>,
  ): Promise<UserPermission> {
    const newUserPermission = new this.userPermissionModel(userPermission);
    return newUserPermission.save();
  }

  async update(
    id: string,
    userPermission: Partial<UserPermission>,
  ): Promise<UserPermission> {
    return this.userPermissionModel
      .findByIdAndUpdate(id, userPermission, { new: true })
      .exec();
  }

  async remove(id: string): Promise<UserPermission> {
    return this.userPermissionModel.findByIdAndDelete(id).exec();
  }
}
