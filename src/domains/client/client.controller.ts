import { Controller, Get, Post, Body, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('api/client')
export class ClientController {
    constructor(private readonly clientService: ClientService) { }

    /**
     * Endpoint para crear un nuevo cliente
     * @param createClientDto Datos del cliente a crear
     * @returns Cliente creado
     */
    @Post()
    create(@Body() createClientDto: CreateClientDto) {
        return this.clientService.create(createClientDto);
    }

    /**
     * Endpoint para crear múltiples clientes a partir de un archivo
     * @param file Archivo con datos de clientes en formato compatible
     * @returns Resultado de la operación de creación masiva
     */
    @Post('bulk')
    @UseInterceptors(FileInterceptor('file'))
    createMany(@UploadedFile() file: Express.Multer.File) {
        return this.clientService.createMany(file);
    }

    /**
     * Endpoint para obtener todos los clientes
     * @param query Parámetros de consulta para filtrar resultados
     * @returns Lista de clientes que coinciden con los criterios de búsqueda
     */
    @Get()
    findAll(@Query() query: any) {
        return this.clientService.findAll(query);
    }

    /**
     * Endpoint para buscar clientes por término de búsqueda
     * @param searchTerm Término de búsqueda para filtrar clientes
     * @returns Lista de clientes que coinciden con el término de búsqueda
     */
    @Get('search')
    search(@Query('searchTerm') searchTerm: string) {
        return this.clientService.search(searchTerm);
    }

    /**
     * Endpoint para obtener un cliente por su ID
     * @param id Identificador único del cliente
     * @returns Cliente encontrado o null si no existe
     */
    @Get(':id')
    findOne(@Query('id') id: string) {
        return this.clientService.findOne(id);
    }

    /**
     * Endpoint para actualizar un cliente existente
     * @param updateClientDto Datos actualizados del cliente
     * @returns Cliente actualizado
     */
    @Post('update')
    update(@Body() updateClientDto: UpdateClientDto) {
        return this.clientService.update(updateClientDto);
    }

    /**
     * Endpoint para eliminar un cliente
     * @param id Identificador único del cliente a eliminar
     * @returns Resultado de la operación de eliminación
     */
    @Post('delete')
    remove(@Body('_id') id: string) {
        return this.clientService.remove(id);
    }

    /**
     * Endpoint para obtener clientes filtrados por rango de fechas
     * @param startDate Fecha de inicio para el filtro (opcional)
     * @param endDate Fecha de fin para el filtro (opcional)
     * @param limit Cantidad máxima de registros a devolver (opcional)
     * @returns Lista de clientes que cumplen con los criterios de filtrado por fecha
     */
    @Get('filter')
    findAllWithDateFilter(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: number,
    ) {
        const query: any = {};

        if (startDate || endDate) {
            query.dateFilter = {};
            if (startDate) query.dateFilter.startDate = new Date(startDate);
            if (endDate) query.dateFilter.endDate = new Date(endDate);
        }

        if (limit) query.limit = Number(limit);

        return this.clientService.findAll(query);
    }

    /**
     * Endpoint para obtener una lista paginada de clientes
     * @param page Número de página actual
     * @param limit Cantidad de registros por página
     * @returns Lista paginada de clientes con metadatos de paginación
     */
    @Get('paginated')
    findAllPaginated(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        const query: any = {};

        if (page) query.page = Number(page);
        if (limit) query.rows = Number(limit);

        return this.clientService.findAll(query);
    }
}