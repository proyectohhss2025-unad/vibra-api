import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventsGateway } from '../../infrastructure/sockets/events.gateway';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';

@Controller('api/users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly eventsGateway: EventsGateway,
        private readonly jwtService: JwtService,
    ) { }

    @Get('trigger')
    triggerEvent() {
        const data = { message: '¡Evento generado desde el backend!' };
        this.eventsGateway.emitEvent(data);
        return { message: 'Evento emitido' };
    }

    @Post('create')
    async create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto)
            .then((response: User) => {
                if (response) {
                    const data = { message: `Se ha registrado un nuevo usuario al sistema, Usuario: ${response.username}` };
                    this.eventsGateway.emitEvent(data);
                    return { username: response.username };
                } else {
                    return null;
                }
            });
    }

    @Post()
    async update(@Body() createUserDto: any) {
        return null//this.usersService.update(createUserDto);
    }

    @Get('all')
    async findAll() {
        return this.usersService.findAll();
    }

    @Get('allPaginate')
    async findAllWithPaginate() {
        return this.usersService.findAllWithPaginate();
    }

    @Get('search/:username')
    async findOne(@Param('username') username: string) {
        return this.usersService.findByUsername(username);
    }
}