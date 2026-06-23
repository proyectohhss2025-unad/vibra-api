import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
  ApiProperty,
} from '@nestjs/swagger';
import { BypassPermission } from 'src/infrastructure/auth/bypass-permission.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { PreTestService } from './preTest.service';
import { CreatePreTestDto } from './dto/create-pretest.dto';
import { UpdatePreTestDto } from './dto/update-pretest.dto';
import { SearchUserAndTestDto } from './dto/search-user-and-test.dto';

class PreTestAnswerDto {
  @ApiProperty({ example: 'Q1' })
  questionId: string;

  @ApiProperty({ example: 'Frecuentemente' })
  answer: any;

  @ApiProperty({ example: 3 })
  points: number;
}

class PreTestDto {
  @ApiProperty({ example: '66c9cce47e6a95e98116c0ab' })
  _id: string;

  @ApiProperty({ example: 'PRETEST-BASELINE-EMOTIONS' })
  testId: string;

  @ApiProperty({ example: '6803296' })
  userId: string;

  @ApiProperty({ type: [PreTestAnswerDto] })
  responses: PreTestAnswerDto[];

  @ApiProperty({ example: 6 })
  totalScore?: number;
}

class PreTestsPaginatedDto {
  @ApiProperty({ type: [PreTestDto] })
  data: PreTestDto[];

  @ApiProperty({ example: 27 })
  total: number;
}

@ApiTags('PreTest')
@Controller('api/pretests')
export class PreTestController {
  constructor(private readonly preTestService: PreTestService) {}

  /**
   * Create a new pre-test
   * @param createTestDto - Data transfer object for creating a pre-test
   * @returns The created pre-test
   */
  @RequirePermission('15')
  @ApiOperation({ summary: 'Create a new pre-test' })
  @ApiResponse({
    status: 201,
    description: 'The pre-test has been successfully created.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post()
  create(@Body() createTestDto: CreatePreTestDto) {
    return this.preTestService.create(createTestDto);
  }

  /**
   * Retrieve all pre-tests
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @returns List of pre-tests
   */
  @RequirePermission('15')
  @ApiOperation({ summary: 'Retrieve all pre-tests' })
  @ApiResponse({ status: 200, description: 'List of pre-tests.' })
  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({ type: PreTestsPaginatedDto })
  findAll(@Query('page') page: number, @Query('limit') limit: number) {
    return this.preTestService.findAll(page, limit);
  }

  @RequirePermission('15')
  @Get('by-test/:testId')
  @ApiOperation({
    summary: 'Obtener respuestas de un test',
    description:
      'Retorna las respuestas de usuarios para un test específico con paginación y filtros.',
  })
  @ApiParam({ name: 'testId', description: 'ID del test' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filtrar por ID de usuario (en string)',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Fecha inicio (ISO)',
  })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Fecha fin (ISO)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array' },
        total: { type: 'number', example: 27 },
      },
    },
  })
  async findByTestId(
    @Param('testId') testId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    return this.preTestService.findByTestId(
      testId,
      pageNum,
      limitNum,
      userId,
      dateFrom,
      dateTo,
    );
  }

  @BypassPermission()
  @Get('count-all-pretests')
  @ApiOperation({
    summary: 'Obtener el número total de pretests',
    description: 'Obtiene el número total de pretests registrados.',
  })
  @ApiOkResponse({
    description: 'Número total de pretests obtenido exitosamente.',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 120 },
      },
    },
  })
  findCountAll(@Query() query: any) {
    return this.preTestService.getCountAll(query);
  }

  /**
   * Update a pre-test
   * @param id - ID of the pre-test to update
   * @param updateTestDto - Data transfer object for updating a pre-test
   * @returns The updated pre-test
   */
  @RequirePermission('15')
  @ApiOperation({ summary: 'Update a pre-test' })
  @ApiResponse({
    status: 200,
    description: 'The pre-test has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Pre-test not found.' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTestDto: UpdatePreTestDto) {
    return this.preTestService.update(id, updateTestDto);
  }

  /**
   * Remove a pre-test
   * @param id - ID of the pre-test to remove
   * @returns A confirmation message
   */
  @RequirePermission('15')
  @ApiOperation({ summary: 'Remove a pre-test' })
  @ApiResponse({
    status: 200,
    description: 'The pre-test has been successfully removed.',
  })
  @ApiResponse({ status: 404, description: 'Pre-test not found.' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.preTestService.remove(id);
  }

  /**
   * Save a pre-test response
   * @param testData - Data of the pre-test response
   * @returns The saved pre-test response
   */
  @ApiOperation({ summary: 'Save a pre-test response' })
  @ApiResponse({
    status: 201,
    description: 'The pre-test response has been successfully saved.',
  })
  @Post('save')
  @ApiBody({
    type: CreatePreTestDto,
    description:
      'Datos del pre-test. Si tu cliente envía { body: \"{...}\" } también es soportado por compatibilidad.',
  })
  @ApiCreatedResponse({ type: PreTestDto })
  async saveTest(@Body() testData: any) {
    return this.preTestService.savePreTestResponse(testData);
  }

  /**
   * Get user and test responses
   * @param userId - User ID
   * @param testId - Test ID
   * @returns User and test responses
   */
  @RequirePermission('15')
  @ApiOperation({ summary: 'Get user and test responses' })
  @ApiResponse({
    status: 200,
    description: 'User and test responses retrieved.',
  })
  @Post('search/userAndTest')
  @ApiBody({ type: SearchUserAndTestDto })
  @ApiOkResponse({ type: [PreTestDto] })
  async getUserAndTestResponses(@Body() dto: SearchUserAndTestDto) {
    return this.preTestService.getUserAndTestResponses(dto.userId, dto.testId);
  }

  /**
   * Get all tests by user ID
   * @param userId - User ID
   * @returns List of tests for the user
   */
  @ApiOperation({ summary: 'Get all tests by user ID' })
  @ApiResponse({ status: 200, description: 'List of tests for the user.' })
  @Get('search/user/:userId')
  @ApiParam({
    name: 'userId',
    description:
      'Identificador del usuario (en Vibra se suele usar el documentNumber).',
    example: '6803296',
  })
  @ApiOkResponse({ type: [PreTestDto] })
  async getUserTests(@Param('userId') userId: string) {
    return this.preTestService.getAlByUserId(userId);
  }

  /**
   * Get all pre-test results
   * @returns List of all pre-test results
   */
  @RequirePermission('15')
  @ApiOperation({ summary: 'Get all pre-test results' })
  @ApiResponse({ status: 200, description: 'List of all pre-test results.' })
  @Get('result-all')
  @ApiOkResponse({ type: [PreTestDto] })
  async getAllResults() {
    return this.preTestService.getAllPreTestResults();
  }

  /**
   * Get pre-test result by ID
   * @param id - ID of the pre-test result
   * @returns The pre-test result
   */
  @ApiOperation({ summary: 'Get pre-test result by ID' })
  @ApiResponse({ status: 200, description: 'The pre-test result.' })
  @ApiResponse({ status: 404, description: 'Pre-test result not found.' })
  @Get('result/:id')
  @ApiParam({
    name: 'id',
    description: 'ID del resultado (ObjectId).',
    example: '66c9cce47e6a95e98116c0ab',
  })
  @ApiOkResponse({ type: PreTestDto })
  async getResultById(@Param('id') id: string) {
    return this.preTestService.getPreTestResultById(id);
  }

  /**
   * Get test completion status for a user
   *
   * Retorna el estado de los tests activos para un usuario según el tipo solicitado:
   * - Sin type: todos los tests activos (backward compatible)
   * - type=initial: solo tests con showAtStart=true
   * - type=final: solo tests con showAtEnd=true
   *
   * @param userId - ID del usuario (documentNumber)
   * @param type - Opcional: 'initial' | 'final'
   * @returns Estado de completitud de tests
   */
  @ApiOperation({
    summary: 'Get test completion status for a user',
    description:
      'Retorna el estado de los tests activos para un usuario. ' +
      'Usar ?type=initial para filtrar tests de inicio (showAtStart) o ' +
      '?type=final para tests de cierre (showAtEnd). Sin type, retorna todos los activos.',
  })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully.' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['initial', 'final'],
    description:
      'Filtro opcional: "initial" para tests de inicio, "final" para tests de cierre',
  })
  @Get('status/:userId')
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario (documentNumber)',
    example: '6803296',
  })
  async getStatusByUserId(
    @Param('userId') userId: string,
    @Query('type') type?: 'initial' | 'final',
  ) {
    return this.preTestService.getStatusByUserId(userId, type);
  }
}
