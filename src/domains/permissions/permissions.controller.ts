import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { Permission } from './schemas/permission.schema';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Post()
  create(@Body() permission: Partial<Permission>) {
    return this.permissionsService.create(permission);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() permission: Partial<Permission>) {
    return this.permissionsService.update(id, permission);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.permissionsService.remove(id);
  }
}
