import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { UserPermissionsService } from './userPermissions.service';
import { UserPermission } from './schemas/userPermission.schema';

@Controller('api/user-permissions')
export class UserPermissionsController {
    constructor(private readonly userPermissionsService: UserPermissionsService) { }

    @Get()
    findAll() {
        return this.userPermissionsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.userPermissionsService.findOne(id);
    }

    @Get('user/:userId')
    findByUser(@Param('userId') userId: string) {
        return this.userPermissionsService.findByUser(userId);
    }

    @Get('permission/:permissionId')
    findByPermission(@Param('permissionId') permissionId: string) {
        return this.userPermissionsService.findByPermission(permissionId);
    }

    @Post()
    create(@Body() userPermission: Partial<UserPermission>) {
        return this.userPermissionsService.create(userPermission);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() userPermission: Partial<UserPermission>) {
        return this.userPermissionsService.update(id, userPermission);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.userPermissionsService.remove(id);
    }
}