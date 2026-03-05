import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, Query } from '@nestjs/common';
import { ConfigService } from './config.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@Controller('api/config')
export class ConfigController {
    constructor(private readonly configService: ConfigService) { }

    /**
     * Create a new configuration
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async addConfig(@Body() createConfigDto: CreateConfigDto) {
        return this.configService.addConfig(createConfigDto);
    }

    /**
     * Get a configuration by ID
     */
    @Post('by-id')
    @HttpCode(HttpStatus.OK)
    async getConfigById(@Body('id') id: string) {
        return this.configService.getConfigById(id);
    }

    /**
     * Get a configuration by name
     */
    @Post('by-name')
    @HttpCode(HttpStatus.OK)
    async getConfigByName(@Body('name') name: string) {
        return this.configService.getConfigByName(name);
    }

    /**
     * Get all flag configurations with pagination
     */
    @Get('flags')
    async getAllFlagsConfigs(
        @Query('page') page: string,
        @Query('rows') rows: string,
    ) {
        return this.configService.getAllFlagsConfigs(parseInt(page), parseInt(rows));
    }

    /**
     * Get all configurations with pagination
     */
    @Get()
    async getAllConfigs(
        @Query('page') page: string,
        @Query('rows') rows: string,
    ) {
        return this.configService.getAllConfigs(parseInt(page), parseInt(rows));
    }

    /**
     * Set a configuration's active status
     */
    @Patch('active')
    async setActiveConfig(
        @Body('_id') id: string,
        @Body('active') active: boolean,
        @Body('editedBy') editedBy: string,
    ) {
        return this.configService.setActiveConfig(id, active, editedBy);
    }

    /**
     * Change a configuration's status
     */
    @Patch('status')
    async setChangeStatusConfig(
        @Body('_id') id: string,
        @Body('active') active: boolean,
        @Body('editedBy') editedBy: string,
    ) {
        return this.configService.setChangeStatusConfig(id, active, editedBy);
    }

    /**
     * Update a configuration
     */
    @Patch()
    async updateConfig(
        @Body('_id') id: string,
        @Body() updateConfigDto: UpdateConfigDto,
    ) {
        return this.configService.updateConfig(id, updateConfigDto);
    }

    /**
     * Validate if a user is allowed in a configuration
     */
    @Post('validate-user')
    async validateUserInConfig(
        @Body('configId') configId: string,
        @Body('userId') userId: string,
    ) {
        return this.configService.validateUserInConfig(configId, userId);
    }

    /**
     * Delete a configuration
     */
    @Delete()
    async deleteConfig(@Body('id') id: string) {
        return this.configService.deleteConfig(id);
    }

    /**
     * Search configurations by term
     */
    @Get('search')
    async searchConfigs(@Query('searchTerm') searchTerm: string) {
        return this.configService.searchConfigs(searchTerm);
    }
}