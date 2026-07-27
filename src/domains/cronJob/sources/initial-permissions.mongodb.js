/**
 * Seed de permisos para la administración de Tareas Programadas (cron jobs).
 *
 * Crea la categoría "Sistema" y los permisos CRON_JOBS_READ y CRON_JOBS_WRITE
 * si no existen.
 *
 * Ejecutar en MongoDB Shell:
 *   use vibra_db
 *   load("src/domains/cronJob/sources/initial-permissions.mongodb.js")
 */

const dbName = 'vibra_db';
const dbConn = db.getSiblingDB(dbName);

// ─── Categoría ───────────────────────────────────────────────────────
const categoryName = 'Sistema';
const categorySerial = 'PCAT-0010';

const existingCategory = dbConn.permissioncategories.findOne({ name: categoryName });
let categoryId;

if (!existingCategory) {
  const result = dbConn.permissioncategories.insertOne({
    name: categoryName,
    description: 'Permisos para administración del sistema, tareas programadas y configuración global.',
    serial: categorySerial,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deleted: false,
  });
  categoryId = result.insertedId;
  print(`Categoría '${categoryName}' creada con ID: ${categoryId}`);
} else {
  categoryId = existingCategory._id;
  print(`Categoría '${categoryName}' ya existe con ID: ${categoryId}`);
}

// ─── Permisos ────────────────────────────────────────────────────────
const permissionsToCreate = [
  {
    name: 'CRON_JOBS_READ',
    description: 'Permite consultar, listar y ver el historial de tareas programadas.',
    serial: 'PERM-0023',
  },
  {
    name: 'CRON_JOBS_WRITE',
    description: 'Permite crear, editar, eliminar, activar/desactivar y ejecutar tareas programadas.',
    serial: 'PERM-0024',
  },
];

for (const perm of permissionsToCreate) {
  const existing = dbConn.permissions.findOne({ name: perm.name });
  if (!existing) {
    dbConn.permissions.insertOne({
      name: perm.name,
      description: perm.description,
      permissionCategory: categoryId,
      serial: perm.serial,
      isActive: true,
      deleted: false,
      createdBy: 'seed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    print(`Permiso '${perm.name}' (${perm.serial}) creado.`);
  } else {
    print(`Permiso '${perm.name}' ya existe.`);
  }
}

print('✅ Seed de permisos de tareas programadas completado.');
