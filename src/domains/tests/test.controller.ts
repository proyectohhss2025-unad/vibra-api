import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { assertOwnership } from 'src/infrastructure/auth/ownership';
import { RequireAuthenticated } from 'src/infrastructure/auth/require-authenticated.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { Test } from './schemas/test.schema';
import { TestService } from './test.service';

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
  showAtStart: boolean;
  showAtEnd: boolean;
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
@RequirePermission('P-EVAL-001')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo test' })
  @ApiCreatedResponse({
    description: 'Test creado exitosamente.',
    type: TestResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Conflicto: testId ya existe.' })
  async create(@Body() createTestDto: CreateTestDto): Promise<Test> {
    return this.testService.create(createTestDto);
  }

  @RequirePermission(['P-EST-001', 'P-DOC-004'])
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

  @RequireAuthenticated()
  @Get('by-testid/:testId')
  @ApiOperation({ summary: 'Obtener un test por su testId (string)' })
  @ApiParam({
    name: 'testId',
    description: 'testId del test (ej: "1", "test-personalidad")',
  })
  @ApiOkResponse({ type: TestResponseDto })
  @ApiResponse({ status: 404, description: 'Test no encontrado.' })
  async findByTestId(@Param('testId') testId: string): Promise<Test> {
    return this.testService.findByTestId(testId);
  }

  @RequireAuthenticated()
  @Get('pending-by-type')
  @ApiOperation({
    summary:
      'Obtener tests pendientes por tipo (initial/final) para un usuario',
  })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: ['initial', 'final'],
    description: 'Tipo de test',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'ID del usuario (opcional: por defecto el de la sesión)',
  })
  @ApiOkResponse({ description: 'Lista de tests pendientes' })
  async findPendingByType(
    @Req() req: any,
    @Query('type') type: 'initial' | 'final',
    @Query('userId') userId?: string,
  ) {
    const ownerId = userId || req.user?.sub;
    assertOwnership(req, ownerId);
    return this.testService.findPendingByType(type, ownerId);
  }

  @RequirePermission('P-EST-001')
  @Get('search')
  @ApiOperation({ summary: 'Buscar tests por término' })
  @ApiQuery({ name: 'searchTerm', required: true, example: 'personalidad' })
  @ApiOkResponse({ type: [TestResponseDto] })
  async search(
    @Query('searchTerm') searchTerm: string,
  ): Promise<{ data: Test[] }> {
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
