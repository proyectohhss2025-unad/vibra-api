import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { Feedback } from './schemas/feedback.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiProperty,
} from '@nestjs/swagger';

class FeedbackDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  isActive: boolean;
}

class FeedbacksPaginatedDto {
  @ApiProperty({ type: [FeedbackDto] })
  feedbacks: FeedbackDto[];

  @ApiProperty()
  length: number;
}

@ApiTags('Feedback')
@Controller('api/feedback')
@ApiBearerAuth()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Get all feedbacks with pagination
   * @param page Page number
   * @param rows Rows per page
   * @returns Object with feedbacks array and total count
   */
  @Get()
  @ApiOperation({ summary: 'Listar feedbacks (paginado)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'rows', required: false, example: '10' })
  @ApiOkResponse({ description: 'Listado paginado.', type: FeedbacksPaginatedDto })
  async findAll(
    @Query('page') page = '1',
    @Query('rows') rows = '10',
  ): Promise<{ feedbacks: Feedback[]; length: number }> {
    return this.feedbackService.findAll(Number.parseInt(page), Number.parseInt(rows));
  }

  /**
   * Get a feedback by id
   * @param id Feedback id
   * @returns The found feedback
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener feedback por id' })
  @ApiParam({ name: 'id', description: 'ID del feedback.' })
  @ApiOkResponse({ description: 'Feedback encontrado.', type: FeedbackDto })
  async findOne(@Param('id') id: string): Promise<Feedback> {
    return this.feedbackService.findById(id);
  }

  /**
   * Get a feedback by description
   * @param description Feedback description
   * @returns The found feedback
   */
  @Post('by-description')
  @ApiOperation({ summary: 'Buscar feedback por descripción' })
  @ApiBody({ schema: { type: 'object', properties: { description: { type: 'string' } }, required: ['description'] } })
  @ApiOkResponse({ description: 'Feedback encontrado.', type: FeedbackDto })
  async findByDescription(
    @Body('description') description: string,
  ): Promise<Feedback> {
    return this.feedbackService.findByDescription(description);
  }

  /**
   * Search feedbacks by various properties
   * @param searchTerm Search term
   * @param page Page number
   * @param rows Rows per page
   * @returns Object with feedbacks array and message
   */
  @Get('search/term')
  @ApiOperation({ summary: 'Buscar feedbacks por término' })
  @ApiQuery({ name: 'searchTerm', required: true, example: 'error' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'rows', required: false, example: '10' })
  @ApiOkResponse({ description: 'Resultados de búsqueda.', schema: { type: 'object' } })
  async searchFeedbacks(
    @Query('searchTerm') searchTerm: string,
    @Query('page') page = '1',
    @Query('rows') rows = '10',
  ): Promise<{ data: Feedback[]; message: string }> {
    return this.feedbackService.searchFeedbacks(
      searchTerm,
      Number.parseInt(page),
      Number.parseInt(rows),
    );
  }

  /**
   * Create a new feedback
   * @param feedbackData Feedback data
   * @param req Request object
   * @returns The created feedback
   */
  @Post()
  @ApiOperation({ summary: 'Crear feedback' })
  @ApiBody({ schema: { type: 'object' } })
  @ApiCreatedResponse({ description: 'Feedback creado.', type: FeedbackDto })
  async create(
    @Body() feedbackData: Partial<Feedback>,
    @Req() req: any,
  ): Promise<Feedback> {
    const userId = req.user?.userId || 'system';
    return this.feedbackService.createFeedback({
      ...feedbackData,
      createdBy: userId,
    });
  }

  /**
   * Upload CSV file and create many feedbacks
   * @param file Uploaded CSV file
   * @returns Message indicating success
   */
  @Post('upload-csv')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Cargar CSV de feedbacks' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOkResponse({ description: 'Feedbacks creados desde archivo.', schema: { type: 'object' } })
  async uploadCsv(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string }> {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.feedbackService.processCsvAndInsertFeedbacks(file.path);
  }

  /**
   * Update an existing feedback
   * @param id Feedback id
   * @param feedbackData Updated feedback data
   * @param req Request object
   * @returns The updated feedback
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar feedback' })
  @ApiParam({ name: 'id', description: 'ID del feedback.' })
  @ApiBody({ schema: { type: 'object' } })
  @ApiOkResponse({ description: 'Feedback actualizado.', type: FeedbackDto })
  async update(
    @Param('id') id: string,
    @Body() feedbackData: Partial<Feedback>,
    @Req() req: any,
  ): Promise<Feedback> {
    const userId = req.user?.userId || 'system';
    return this.feedbackService.updateFeedback(id, {
      ...feedbackData,
      editedBy: userId,
    });
  }

  /**
   * Update feedback status
   * @param id Feedback id
   * @param isActive New active status
   * @param req Request object
   * @returns The updated feedback
   */
  @Put(':id/status')
  @ApiOperation({ summary: 'Actualizar estado del feedback' })
  @ApiParam({ name: 'id', description: 'ID del feedback.' })
  @ApiBody({ schema: { type: 'object', properties: { isActive: { type: 'boolean' } }, required: ['isActive'] } })
  @ApiOkResponse({ description: 'Estado actualizado.', type: FeedbackDto })
  async updateStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @Req() req: any,
  ): Promise<Feedback> {
    const userId = req.user?.userId || 'system';
    return this.feedbackService.updateStatusFeedback(id, isActive, userId);
  }

  /**
   * Delete a feedback (soft delete)
   * @param id Feedback id
   * @param req Request object
   * @returns The deleted feedback
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar feedback (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID del feedback.' })
  @ApiOkResponse({ description: 'Feedback eliminado.', type: FeedbackDto })
  async delete(@Param('id') id: string, @Req() req: any): Promise<Feedback> {
    const userId = req.user?.userId || 'system';
    return this.feedbackService.deleteFeedback(id, userId);
  }

  /**
   * Hard delete a feedback
   * @param id Feedback id
   * @returns The deleted feedback
   */
  @Delete(':id/hard')
  @ApiOperation({ summary: 'Eliminar feedback (hard delete)' })
  @ApiParam({ name: 'id', description: 'ID del feedback.' })
  @ApiOkResponse({ description: 'Feedback eliminado definitivamente.', type: FeedbackDto })
  async hardDelete(@Param('id') id: string): Promise<Feedback> {
    return this.feedbackService.hardDeleteFeedback(id);
  }

  /**
   * Soft delete a feedback with specific parameters
   * @param id Feedback id
   * @param deleted Deletion status
   * @param req Request object
   * @returns The deleted feedback
   */
  @Put(':id/soft-delete')
  @ApiOperation({ summary: 'Soft delete con parámetros' })
  @ApiParam({ name: 'id', description: 'ID del feedback.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { deleted: { type: 'boolean' } },
      required: ['deleted'],
    },
  })
  @ApiOkResponse({ description: 'Feedback marcado como eliminado.', type: FeedbackDto })
  async softDelete(
    @Param('id') id: string,
    @Body('deleted') deleted: boolean,
    @Req() req: any,
  ): Promise<Feedback> {
    const userId = req.user?.userId || 'system';
    return this.feedbackService.deleteFeedback(id, userId);
  }
}
