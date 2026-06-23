import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { PermissionCategoryService } from './permissionCategory.service';
import { PermissionCategory } from './schemas/permissionCategory.schema';

@ApiTags('Permission Categories')
@Controller('api/permissionCategory')
export class PermissionCategoryController {
  constructor(private readonly categoryService: PermissionCategoryService) {}

  @Get('all')
  @ApiOperation({ summary: 'Listar categorías de permisos' })
  @ApiOkResponse({
    description: 'Lista de categorías.',
    type: [PermissionCategory],
  })
  async findAll(@Query('page') page?: string, @Query('rows') rows?: string) {
    const data = await this.categoryService.findAll();
    return { items: data, total: data.length };
  }
}
