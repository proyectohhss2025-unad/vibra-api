/**
 * Registro único de seriales de permiso (F1 del plan de ajustes, DEC-1).
 *
 * con el seed vigente (`npm run audit:serials`).
 *
 * El formato de cada entrada imita a un documento de la colección
 * `permissions` para que `scripts/audit-permission-serials.mjs` pueda leerlo con
 * la misma regla que los seeds, y para que el seed de contrato lo recorra tal
 * cual.
 */
export interface PermissionSerialEntry {
  /** Serial canónico. Único en toda la plataforma. */
  serial: string;
  /** Nombre legible, el que verá quien administre permisos. */
  name: string;
  /** Serial numérico que reemplaza. Solo para trazabilidad y migración. */
  legacy?: string;
  /** Qué autoriza, en una línea. */
  grants: string;
}

export const PERMISSION_SERIALS: readonly PermissionSerialEntry[] = [
  {
    serial: 'P-IDEA-001',
    name: 'Gestionar ideas',
    legacy: '0',
    grants: 'Crear y administrar el backlog de ideas',
  },
  {
    serial: 'P-EMO-001',
    name: 'Gestionar emociones',
    legacy: '8',
    grants: 'Catálogo de emociones: lectura y mantenimiento',
  },
  {
    serial: 'P-ADM-001',
    name: 'Administración de personas',
    legacy: '9',
    grants:
      'Usuarios, roles y permisos, alta de docentes, participantes (ver, crear en lote y eliminar)',
  },
  {
    serial: 'P-ADM-002',
    name: 'Administración de cursos e instituciones',
    legacy: '10',
    grants: 'Cursos, inscripciones docentes y datos de la institución',
  },
  {
    serial: 'P-CFG-001',
    name: 'Gestionar configuración',
    legacy: '11',
    grants: 'Parámetros del sistema y flags',
  },
  {
    serial: 'P-EVAL-001',
    name: 'Gestionar evaluaciones',
    legacy: '15',
    grants: 'Tests y pretests: creación, edición y consulta',
  },
  {
    serial: 'P-ACT-001',
    name: 'Gestionar actividades',
    legacy: '16',
    grants: 'Actividades y retos: creación, edición y consulta',
  },
] as const;

/** Mapa serial numérico heredado → serial canónico. Para migrar datos existentes. */
export const LEGACY_SERIAL_MAP: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    PERMISSION_SERIALS.filter((entry) => entry.legacy).map((entry) => [
      entry.legacy as string,
      entry.serial,
    ]),
  ),
);

/** Seriales canónicos como lista simple, para validaciones rápidas. */
export const CANONICAL_SERIALS: readonly string[] = PERMISSION_SERIALS.map(
  (entry) => entry.serial,
);
