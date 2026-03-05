import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

/**
 * DTO para la creación de un rol
 */
export class CreateRoleDto {
    /**
     * Nombre del rol
     * @example 'Administrador'
     */
    @IsString()
    @IsNotEmpty()
    name: string;

    /**
     * Descripción del rol
     * @example 'Rol con acceso a todas las funcionalidades'
     */
    @IsString()
    @IsNotEmpty()
    description: string;

    /**
     * ID de la plantilla de permisos asociada al rol
     */
    @IsOptional()
    permissionTemplate?: Types.ObjectId;

    /**
     * Indica si el rol tiene permisos de superadministrador
     * @default false
     */
    @IsBoolean()
    @IsOptional()
    isSuperAdmin?: boolean;

    /**
     * Usuario que crea el rol
     */
    @IsString()
    @IsNotEmpty()
    createdBy: string;
}