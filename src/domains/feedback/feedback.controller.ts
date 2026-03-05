import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { Feedback } from './schemas/feedback.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Feedback')
@Controller('feedback')
@ApiBearerAuth()
export class FeedbackController {
    constructor(private readonly feedbackService: FeedbackService) { }

    /**
     * Get all feedbacks with pagination
     * @param page Page number
     * @param rows Rows per page
     * @returns Object with feedbacks array and total count
     */
    @Get()
    async findAll(
        @Query('page') page = '1',
        @Query('rows') rows = '10'
    ): Promise<{ feedbacks: Feedback[], length: number }> {
        return this.feedbackService.findAll(parseInt(page), parseInt(rows));
    }

    /**
     * Get a feedback by id
     * @param id Feedback id
     * @returns The found feedback
     */
    @Get(':id')
    async findOne(@Param('id') id: string): Promise<Feedback> {
        return this.feedbackService.findById(id);
    }

    /**
     * Get a feedback by description
     * @param description Feedback description
     * @returns The found feedback
     */
    @Post('by-description')
    async findByDescription(@Body('description') description: string): Promise<Feedback> {
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
    async searchFeedbacks(
        @Query('searchTerm') searchTerm: string,
        @Query('page') page = '1',
        @Query('rows') rows = '10'
    ): Promise<{ data: Feedback[], message: string }> {
        return this.feedbackService.searchFeedbacks(searchTerm, parseInt(page), parseInt(rows));
    }

    /**
     * Create a new feedback
     * @param feedbackData Feedback data
     * @param req Request object
     * @returns The created feedback
     */
    @Post()
    async create(@Body() feedbackData: Partial<Feedback>, @Req() req: any): Promise<Feedback> {
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
    async uploadCsv(@UploadedFile() file: Express.Multer.File): Promise<{ message: string }> {
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
    async softDelete(
        @Param('id') id: string,
        @Body('deleted') deleted: boolean,
        @Req() req: any,
    ): Promise<Feedback> {
        const userId = req.user?.userId || 'system';
        return this.feedbackService.deleteFeedback(id, userId);
    }
}