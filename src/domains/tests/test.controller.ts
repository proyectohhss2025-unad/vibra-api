import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { BypassPermission } from 'src/infrastructure/auth/bypass-permission.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { TestService } from './test.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { Test } from './schemas/test.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

class TestResponseDto {
  _id: string;
  testId: string;
  title: string;
  description: string;
  category?: string;
  difficulty: number;
  timeLimit?: number;
  passingScore?: number;
  isActive: boolean;
  questions: any[];
  tags?: string[];
  version?: number;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

class TestsPaginatedDto {
  data: TestResponseDto[];
  total: number;
}

@ApiTags('Tests')
@Controller('api/tests')
@RequirePermission('15')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo test' })
  @ApiCreatedResponse({ description: 'Test creado exitosamente.', type: TestResponseDto })
  @ApiResponse({ status: 409, description: 'Conflicto: testId ya existe.' })
  async create(@Body() createTestDto: CreateTestDto): Promise<Test> {
    return this.testService.create(createTestDto);
  }

  @BypassPermission()
  @Get()
  @ApiOperation({ summary: 'Listar todos los tests (paginado)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, example: 'personalidad' })
  @ApiQuery({ name: 'category', required: false, example: 'Emociones' })
  @ApiOkResponse({ type: TestsPaginatedDto })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ): Promise<{ data: Test[]; total: number }> {
    return this.testService.findAll(page, limit, search, category);
  }

  @BypassPermission()
  @Get('by-testid/:testId')
  @ApiOperation({ summary: 'Obtener un test por su testId (string)' })
  @ApiParam({ name: 'testId', description: 'testId del test (ej: "1", "test-personalidad")' })
  @ApiOkResponse({ type: TestResponseDto })
  @ApiResponse({ status: 404, description: 'Test no encontrado.' })
  async findByTestId(@Param('testId') testId: string): Promise<Test> {
    return this.testService.findByTestId(testId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar tests por término' })
  @ApiQuery({ name: 'searchTerm', required: true, example: 'personalidad' })
  @ApiOkResponse({ type: [TestResponseDto] })
  async search(@Query('searchTerm') searchTerm: string): Promise<{ data: Test[] }> {
    const data = await this.testService.search(searchTerm);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un test por su ID' })
  @ApiParam({ name: 'id', description: 'ID del test (ObjectId de MongoDB)' })
  @ApiOkResponse({ type: TestResponseDto })
  @ApiResponse({ status: 404, description: 'Test no encontrado.' })
  async findOne(@Param('id') id: string): Promise<Test> {
    return this.testService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un test' })
  @ApiParam({ name: 'id', description: 'ID del test (ObjectId de MongoDB)' })
  @ApiBody({ type: UpdateTestDto })
  @ApiOkResponse({ type: TestResponseDto })
  @ApiResponse({ status: 404, description: 'Test no encontrado.' })
  async update(
    @Param('id') id: string,
    @Body() updateTestDto: UpdateTestDto,
  ): Promise<Test> {
    return this.testService.update(id, updateTestDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un test' })
  @ApiParam({ name: 'id', description: 'ID del test (ObjectId de MongoDB)' })
  @ApiResponse({ status: 204, description: 'Test eliminado exitosamente.' })
  @ApiResponse({ status: 404, description: 'Test no encontrado.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.testService.remove(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activar/Desactivar un test' })
  @ApiParam({ name: 'id', description: 'ID del test (ObjectId de MongoDB)' })
  @ApiOkResponse({ type: TestResponseDto })
  @ApiResponse({ status: 404, description: 'Test no encontrado.' })
  async toggleStatus(@Param('id') id: string): Promise<Test> {
    return this.testService.toggleStatus(id);
  }
}
