import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PreTestService } from './preTest.service';
import { CreatePreTestDto } from './dto/create-pretest.dto';
import { UpdatePreTestDto } from './dto/update-pretest.dto';

@ApiTags('PreTest')
@Controller('api/pretests')
export class PreTestController {
  constructor(private readonly preTestService: PreTestService) { }

  /**
   * Create a new pre-test
   * @param createTestDto - Data transfer object for creating a pre-test
   * @returns The created pre-test
   */
  @ApiOperation({ summary: 'Create a new pre-test' })
  @ApiResponse({ status: 201, description: 'The pre-test has been successfully created.' })
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
  @ApiOperation({ summary: 'Retrieve all pre-tests' })
  @ApiResponse({ status: 200, description: 'List of pre-tests.' })
  @Get()
  findAll(@Query('page') page: number, @Query('limit') limit: number) {
    return this.preTestService.findAll(page, limit);
  }

  /**
   * Update a pre-test
   * @param id - ID of the pre-test to update
   * @param updateTestDto - Data transfer object for updating a pre-test
   * @returns The updated pre-test
   */
  @ApiOperation({ summary: 'Update a pre-test' })
  @ApiResponse({ status: 200, description: 'The pre-test has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Pre-test not found.' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTestDto: UpdatePreTestDto) {
    return this.preTestService.update(+id, updateTestDto);
  }

  /**
   * Remove a pre-test
   * @param id - ID of the pre-test to remove
   * @returns A confirmation message
   */
  @ApiOperation({ summary: 'Remove a pre-test' })
  @ApiResponse({ status: 200, description: 'The pre-test has been successfully removed.' })
  @ApiResponse({ status: 404, description: 'Pre-test not found.' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.preTestService.remove(+id);
  }

  /**
   * Save a pre-test response
   * @param testData - Data of the pre-test response
   * @returns The saved pre-test response
   */
  @ApiOperation({ summary: 'Save a pre-test response' })
  @ApiResponse({ status: 201, description: 'The pre-test response has been successfully saved.' })
  @Post('save')
  async saveTest(@Body() testData: any) {
    return this.preTestService.savePreTestResponse(testData);
  }

  /**
   * Get user and test responses
   * @param userId - User ID
   * @param testId - Test ID
   * @returns User and test responses
   */
  @ApiOperation({ summary: 'Get user and test responses' })
  @ApiResponse({ status: 200, description: 'User and test responses retrieved.' })
  @Post('search/userAndTest')
  async getUserAndTestResponses(@Body() userId: string, @Body() testId: string) {
    return this.preTestService.getUserAndTestResponses(userId, testId);
  }

  /**
   * Get all tests by user ID
   * @param userId - User ID
   * @returns List of tests for the user
   */
  @ApiOperation({ summary: 'Get all tests by user ID' })
  @ApiResponse({ status: 200, description: 'List of tests for the user.' })
  @Get('search/user/:userId')
  async getUserTests(@Param('userId') userId: string) {
    return this.preTestService.getAlByUserId(userId);
  }

  /**
   * Get all pre-test results
   * @returns List of all pre-test results
   */
  @ApiOperation({ summary: 'Get all pre-test results' })
  @ApiResponse({ status: 200, description: 'List of all pre-test results.' })
  @Get('result-all')
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
  async getResultById(@Param('id') id: string) {
    return this.preTestService.getPreTestResultById(id);
  }
}
