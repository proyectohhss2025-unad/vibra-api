import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para la búsqueda de un rol por nombre
 */
export class FindRoleDto {
  /**
   * Nombre del rol a buscar
   * @example 'Administrador'
   */
  @IsString()
  @IsNotEmpty()
  name: string;
}
