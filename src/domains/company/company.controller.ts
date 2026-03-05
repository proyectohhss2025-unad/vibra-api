import { BadRequestException, Body, Controller, Delete, Get, Patch, Post, Query } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Controller('api/company')
export class CompanyController {
    constructor(private readonly companyService: CompanyService) { }

    /**
     * Create a new company
     * @param createCompanyDto - Data for creating a company
     */
    @Post()
    async create(@Body() createCompanyDto: CreateCompanyDto) {
        return this.companyService.create(createCompanyDto);
    }

    /**
     * Get all companies with pagination
     * @param page - Page number
     * @param rows - Number of rows per page
     */
    @Get()
    async findAll(
        @Query('page') page: string = '1',
        @Query('rows') rows: string = '10',
    ) {
        return this.companyService.findAll(parseInt(page), parseInt(rows));
    }

    /**
     * Get a company by ID
     * @param id - Company ID
     */
    @Post('id')
    async findById(@Body('id') id: string) {
        return this.companyService.findById(id);
    }

    /**
     * Get the main company
     */
    @Get('main')
    async findByIsMain() {
        return this.companyService.findByIsMain();
    }

    /**
     * Get a company by name
     * @param name - Company name
     */
    @Post('name')
    async findByName(@Body('name') name: string) {
        return this.companyService.findByName(name);
    }

    /**
     * Update a company
     * @param updateCompanyDto - Data for updating the company
     */
    @Patch()
    async update(@Body() updateCompanyDto: UpdateCompanyDto) {
        if (!updateCompanyDto._id) {
            throw new BadRequestException('Company ID is required');
        }
        return this.companyService.update(updateCompanyDto);
    }

    /**
     * Delete a company by ID
     * @param id - Company ID
     */
    @Delete()
    async remove(@Body('id') id: string) {
        return this.companyService.remove(id);
    }

    /**
     * Search companies by term
     * @param searchTerm - Search term
     * @param page - Page number
     * @param rows - Number of rows per page
     */
    @Get('search')
    async search(
        @Query('searchTerm') searchTerm: string,
        @Query('page') page: string = '1',
        @Query('rows') rows: string = '10',
    ) {
        return this.companyService.search(searchTerm, parseInt(page), parseInt(rows));
    }

    /**
     * Set a company as active or inactive
     * @param id - Company ID
     * @param active - Active status
     * @param editedBy - User who edited the company
     */
    @Patch('active')
    async setActive(
        @Body('_id') id: string,
        @Body('active') active: boolean,
        @Body('editedBy') editedBy: string,
    ) {
        return this.companyService.setActive(id, active, editedBy);
    }
}