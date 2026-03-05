/**
 * Interfaz para los parámetros de paginación
 */
export interface PaginationParams {
    page?: number;
    limit?: number;
}

/**
 * Interfaz para la respuesta paginada
 */
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

/**
 * Función para crear una respuesta paginada
 * @param data Los datos a paginar
 * @param total El número total de registros
 * @param page El número de página actual
 * @param limit El límite de registros por página
 * @returns Una respuesta paginada
 */
export function createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
): PaginatedResponse<T> {
    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}