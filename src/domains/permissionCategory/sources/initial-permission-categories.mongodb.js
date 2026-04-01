// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("vibra_db");

// Create permissioncategories collection if it doesn't exist
db.createCollection("permissioncategories");

// Clear existing data to avoid duplicates
db.permissioncategories.deleteMany({});

// Initial permission categories data (Dashboard Vibra - participación estudiantil)
const permissionCategoriesData = [
  {
    name: "Usuarios",
    description:
      "Permisos para la administración de usuarios (estudiantes, docentes, administradores) en Vibra.",
    serial: "PCAT-0001",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Roles y Permisos",
    description:
      "Permisos para la gestión de roles, permisos y control de acceso del dashboard.",
    serial: "PCAT-0002",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Emociones",
    description:
      "Permisos para administrar el catálogo de emociones y su uso en actividades.",
    serial: "PCAT-0003",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Actividades",
    description:
      "Permisos para administrar actividades de bienestar (crear, editar, publicar, desactivar).",
    serial: "PCAT-0004",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Notificaciones",
    description:
      "Permisos para gestionar notificaciones, canales y tipos para comunicación con la comunidad.",
    serial: "PCAT-0005",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Rankings y Rangos",
    description:
      "Permisos para consultar y administrar rankings, puntajes y niveles de participación.",
    serial: "PCAT-0006",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "PreTest",
    description:
      "Permisos para consultar y administrar resultados de pre-test y línea base.",
    serial: "PCAT-0007",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Reportes",
    description:
      "Permisos para generar reportes y analítica de participación estudiantil.",
    serial: "PCAT-0008",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Tareas",
    description:
      "Permisos para gestionar tareas y seguimiento de acciones de bienestar.",
    serial: "PCAT-0009",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Insert the permission categories
try {
  const result = db.permissioncategories.insertMany(permissionCategoriesData);
  print(`Successfully inserted ${result.insertedCount} permission categories`);
} catch (error) {
  print(`Error inserting permission categories: ${error.message}`);
}

// Verify insertion
const count = db.permissioncategories.countDocuments();
print(`Total permission categories in database: ${count}`);
