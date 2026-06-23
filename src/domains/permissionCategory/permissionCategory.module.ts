import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PermissionCategory,
  PermissionCategorySchema,
} from './schemas/permissionCategory.schema';
import { PermissionCategoryController } from './permissionCategory.controller';
import { PermissionCategoryService } from './permissionCategory.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PermissionCategory.name, schema: PermissionCategorySchema },
    ]),
  ],
  controllers: [PermissionCategoryController],
  providers: [PermissionCategoryService],
  exports: [PermissionCategoryService],
})
export class PermissionCategoryModule {}
