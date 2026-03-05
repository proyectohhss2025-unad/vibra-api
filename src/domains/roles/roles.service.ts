import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppLoggerService } from 'src/helpers/logger/logger.service';
import { Role } from './schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginatedResponse, PaginationDto } from './dto/pagination.dto';
import { generateSerial } from 'src/utils/string';

@Injectable()
export class RolesService {
    constructor(
        @InjectModel(Role.name) private roleModel: Model<Role>,
        private readonly logger: AppLoggerService,
    ) {
        this.logger.log('RolesService initialized');
    }

    /**
     * Crea un nuevo rol
     * @param createRoleDto DTO con los datos del rol a crear
     * @returns El rol creado
     */
    async create(createRoleDto: CreateRoleDto): Promise<Role> {
        this.logger.log('Creating a new role...');

        // Verificar si ya existe un rol con el mismo nombre
        const existingRole = await this.roleModel.findOne({ name: createRoleDto.name }).exec();
        if (existingRole) {
            this.logger.warn(`A role with name ${createRoleDto.name} already exists`);
            throw new Error('A role with that name already exists');
        }

        // Generar serial único
        const count = await this.roleModel.countDocuments().exec();
        const serial = generateSerial(`${count}`);

        // Crear y guardar el nuevo rol
        const createdRole = new this.roleModel({
            ...createRoleDto,
            serial,
            createdAt: new Date(),
        });

        const savedRole = await createdRole.save();
        this.logger.log(`Role created successfully with ID: ${savedRole._id}`);

        return savedRole;
    }

    /**
     * Inserta múltiples roles desde un archivo CSV
     * @param roles Array de roles a insertar
     */
    async insertMany(roles: Partial<Role>[]): Promise<void> {
        try {
            await this.roleModel.insertMany(roles);
            this.logger.log(`${roles.length} roles inserted successfully`);
        } catch (error: any) {
            this.logger.error(`Error inserting roles:', ${error.message}`);
            throw error;
        }
    }

    /**
     * Actualiza un rol existente
     * @param updateRoleDto DTO con los datos del rol a actualizar
     * @returns El rol actualizado
     */
    async update(updateRoleDto: UpdateRoleDto): Promise<Role> {
        this.logger.log(`Updating role with ID: ${updateRoleDto._id}`);

        const role = await this.roleModel.findById(updateRoleDto._id).exec();
        if (!role) {
            this.logger.warn(`Role with ID ${updateRoleDto._id} not found`);
            throw new NotFoundException('Role not found');
        }

        // Actualizar propiedades
        Object.assign(role, {
            ...updateRoleDto,
            editedAt: new Date(),
        });

        const updatedRole = await role.save();
        this.logger.log(`Role updated successfully: ${updatedRole._id}`);

        return updatedRole;
    }

    /**
     * Método legacy para mantener compatibilidad
     */
    async updateKeepSessionActive(createRoleDto: Role): Promise<Role> {
        this.logger.log('Using legacy update method...');
        const createdRole = new this.roleModel({ ...createRoleDto });
        return createdRole.save();
    }

    /**
     * Obtiene todos los roles con paginación
     * @param paginationDto Parámetros de paginación
     * @returns Lista paginada de roles
     */
    async findAll(paginationDto?: PaginationDto): Promise<PaginatedResponse<Role>> {
        this.logger.log('Fetching roles with pagination...');

        const { page = 1, limit = 10 } = paginationDto || {};
        const skip = (page - 1) * limit;

        const [roles, totalItems] = await Promise.all([
            this.roleModel.find()
                .populate({
                    path: 'permissionTemplate',
                    model: 'PermissionTemplate'
                })
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .exec(),
            this.roleModel.countDocuments().exec()
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return {
            items: roles,
            meta: {
                totalItems,
                itemsPerPage: limit,
                currentPage: page,
                totalPages
            }
        };
    }

    /**
     * Busca un rol por su ID
     * @param id ID del rol a buscar
     * @returns El rol encontrado
     */
    async findById(id: string): Promise<Role> {
        this.logger.log(`Finding role by ID: ${id}`);

        const role = await this.roleModel.findById(id)
            .populate({
                path: 'permissionTemplate',
                model: 'PermissionTemplate'
            })
            .exec();

        if (!role) {
            this.logger.warn(`Role with ID ${id} not found`);
            throw new NotFoundException('Role not found');
        }

        return role;
    }

    /**
     * Busca un rol por su nombre
     * @param name Nombre del rol a buscar
     * @returns El rol encontrado
     */
    async findByName(name: string): Promise<Role> {
        this.logger.log(`Finding role by name: ${name}`);

        const role = await this.roleModel.findOne({ name })
            .populate({
                path: 'permissionTemplate',
                model: 'PermissionTemplate'
            })
            .exec();

        if (!role) {
            this.logger.warn(`Role with name ${name} not found`);
            throw new NotFoundException('Role not found');
        }

        return role;
    }

    /**
     * Elimina un rol por su ID
     * @param id ID del rol a eliminar
     * @returns El rol eliminado
     */
    async remove(id: string): Promise<Role> {
        this.logger.log(`Removing role with ID: ${id}`);

        const deletedRole = await this.roleModel.findByIdAndDelete(id).exec();

        if (!deletedRole) {
            this.logger.warn(`Role with ID ${id} not found`);
            throw new NotFoundException('Role not found');
        }

        this.logger.log(`Role removed successfully: ${deletedRole._id}`);
        return deletedRole;
    }
}
