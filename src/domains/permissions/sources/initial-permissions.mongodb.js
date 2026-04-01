// MongoDB Playground
// Base de datos actual a usar.
use("vibra_db");

const targetDbName = "vibra_db";
const categoryCollection = "permissioncategories";
const permissionCollection = "permissions";

(async () => {
  const targetDb = db.getSiblingDB(targetDbName);
  const currentDb = db;

  const categoriesInTargetDb = targetDb.getCollection(categoryCollection);
  const categoriesInCurrentDb = currentDb.getCollection(categoryCollection);

  const targetDbCategoriesCount = await categoriesInTargetDb.countDocuments();
  const currentDbCategoriesCount = await categoriesInCurrentDb.countDocuments();

  const database = targetDbCategoriesCount > 0 ? targetDb : currentDb;

  if (!database.getCollectionNames().includes(categoryCollection)) {
    database.createCollection(categoryCollection);
  }
  if (!database.getCollectionNames().includes(permissionCollection)) {
    database.createCollection(permissionCollection);
  }

  const categories = database.getCollection(categoryCollection);
  const permissions = database.getCollection(permissionCollection);
  const categoryCollectionName = `${database.getName()}.${categoryCollection}`;

  print(`DB actual (contexto): ${currentDb.getName()}`);
  print(`DB objetivo: ${targetDb.getName()}`);
  print(
    `Categorías en DB objetivo: ${targetDbCategoriesCount} | Categorías en DB actual: ${currentDbCategoriesCount}`,
  );
  print(`Colección de categorías usada por el seed: ${categoryCollectionName}`);

  const normalizeKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const getCategoryName = (category) =>
    category?.name ?? category?.title ?? category?.nombre ?? null;

  const requiredCategories = [
    {
      name: "Usuarios",
      description:
        "Permisos para la administración de usuarios (estudiantes, docentes, administradores) en Vibra.",
      serial: "PCAT-0001",
    },
    {
      name: "Roles y Permisos",
      description:
        "Permisos para la gestión de roles, permisos y control de acceso del dashboard.",
      serial: "PCAT-0002",
    },
    {
      name: "Emociones",
      description:
        "Permisos para administrar el catálogo de emociones y su uso en actividades.",
      serial: "PCAT-0003",
    },
    {
      name: "Actividades",
      description:
        "Permisos para administrar actividades de bienestar (crear, editar, publicar, desactivar).",
      serial: "PCAT-0004",
    },
    {
      name: "Notificaciones",
      description:
        "Permisos para gestionar notificaciones, canales y tipos para comunicación con la comunidad.",
      serial: "PCAT-0005",
    },
    {
      name: "Rankings y Rangos",
      description:
        "Permisos para consultar y administrar rankings, puntajes y niveles de participación.",
      serial: "PCAT-0006",
    },
    {
      name: "PreTest",
      description:
        "Permisos para consultar y administrar resultados de pre-test y línea base.",
      serial: "PCAT-0007",
    },
    {
      name: "Reportes",
      description:
        "Permisos para generar reportes y analítica de participación estudiantil.",
      serial: "PCAT-0008",
    },
    {
      name: "Tareas",
      description:
        "Permisos para gestionar tareas y seguimiento de acciones de bienestar.",
      serial: "PCAT-0009",
    },
  ];

  const buildCategoryMap = async () => {
    const map = {};
    const docs = await categories
      .find({}, { _id: 1, name: 1, title: 1, nombre: 1 })
      .toArray();
    docs.forEach((category) => {
      const categoryName = getCategoryName(category);
      if (!categoryName) return;
      map[normalizeKey(categoryName)] = category._id;
    });
    return map;
  };

  let permissionCategoriesByName = await buildCategoryMap();

  print(
    `Categorías existentes (normalizadas): ${Object.keys(permissionCategoriesByName).join(", ")}`,
  );

  const getPermissionCategoryId = (name) =>
    permissionCategoriesByName[normalizeKey(name)] || null;

  const missingCategories = requiredCategories.filter(
    (c) => !getPermissionCategoryId(c.name),
  );

  if (missingCategories.length > 0) {
    print(`Colección de categorías detectada: ${categoryCollectionName}`);

    try {
      const now = new Date();
      const seedUser = "seed";

      const operations = missingCategories.map((c) => ({
        updateOne: {
          filter: { name: c.name },
          update: {
            $set: {
              name: c.name,
              description: c.description,
              serial: c.serial,
              isActive: true,
              editedAt: now,
              editedBy: seedUser,
            },
            $setOnInsert: {
              createdAt: now,
              createdBy: seedUser,
              deleted: false,
            },
          },
          upsert: true,
        },
      }));

      const result = await categories.bulkWrite(operations, { ordered: true });
      print("Resultado de inserción/actualización de categorías:");
      printjson(result);
    } catch (error) {
      print(`Error insertando categorías faltantes: ${error.message}`);
    }

    permissionCategoriesByName = await buildCategoryMap();
  }

  const stillMissingCategories = requiredCategories.filter(
    (c) => !getPermissionCategoryId(c.name),
  );
  if (stillMissingCategories.length > 0) {
    throw new Error(
      `Faltan categorías requeridas para asociar permisos: ${stillMissingCategories
        .map((c) => c.name)
        .join(", ")}`,
    );
  }

  // Limpiar datos existentes para evitar duplicados.
  await permissions.deleteMany({});

  const permissionsData = [
  {
    name: "USERS_READ",
    description: "Permite listar y consultar usuarios.",
    permissionCategory: getPermissionCategoryId("Usuarios"),
    serial: "PERM-0001",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "USERS_WRITE",
    description: "Permite crear y actualizar usuarios.",
    permissionCategory: getPermissionCategoryId("Usuarios"),
    serial: "PERM-0002",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "ROLES_READ",
    description: "Permite listar y consultar roles.",
    permissionCategory: getPermissionCategoryId("Roles y Permisos"),
    serial: "PERM-0003",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "ROLES_WRITE",
    description: "Permite crear y actualizar roles.",
    permissionCategory: getPermissionCategoryId("Roles y Permisos"),
    serial: "PERM-0004",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "PERMISSIONS_READ",
    description: "Permite listar y consultar permisos.",
    permissionCategory: getPermissionCategoryId("Roles y Permisos"),
    serial: "PERM-0005",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "PERMISSIONS_WRITE",
    description: "Permite crear, actualizar y eliminar permisos.",
    permissionCategory: getPermissionCategoryId("Roles y Permisos"),
    serial: "PERM-0006",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "ACTIVITIES_READ",
    description: "Permite consultar actividades disponibles.",
    permissionCategory: getPermissionCategoryId("Actividades"),
    serial: "PERM-0007",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "ACTIVITIES_WRITE",
    description: "Permite crear, actualizar y desactivar actividades.",
    permissionCategory: getPermissionCategoryId("Actividades"),
    serial: "PERM-0008",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "NOTIFICATIONS_READ",
    description: "Permite consultar notificaciones.",
    permissionCategory: getPermissionCategoryId("Notificaciones"),
    serial: "PERM-0009",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "NOTIFICATIONS_WRITE",
    description: "Permite crear notificaciones y ejecutar cargas masivas.",
    permissionCategory: getPermissionCategoryId("Notificaciones"),
    serial: "PERM-0010",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "EMOTIONS_READ",
    description: "Permite consultar el catálogo de emociones.",
    permissionCategory: getPermissionCategoryId("Emociones"),
    serial: "PERM-0011",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "EMOTIONS_WRITE",
    description: "Permite crear y actualizar emociones.",
    permissionCategory: getPermissionCategoryId("Emociones"),
    serial: "PERM-0012",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "RANKINGS_READ",
    description: "Permite consultar la clasificación y puntuaciones de los usuarios.",
    permissionCategory: getPermissionCategoryId("Rankings y Rangos"),
    serial: "PERM-0013",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "RANKINGS_WRITE",
    description: "Permite gestionar o recalcular los rankings.",
    permissionCategory: getPermissionCategoryId("Rankings y Rangos"),
    serial: "PERM-0014",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "RANKS_READ",
    description: "Permite listar y consultar los niveles o rangos disponibles.",
    permissionCategory: getPermissionCategoryId("Rankings y Rangos"),
    serial: "PERM-0015",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "RANKS_WRITE",
    description: "Permite crear y actualizar niveles o rangos del sistema.",
    permissionCategory: getPermissionCategoryId("Rankings y Rangos"),
    serial: "PERM-0016",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "PRETEST_READ",
    description: "Permite consultar los resultados y configuración de los pre-tests.",
    permissionCategory: getPermissionCategoryId("PreTest"),
    serial: "PERM-0017",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "PRETEST_WRITE",
    description: "Permite crear y modificar las evaluaciones de pre-test.",
    permissionCategory: getPermissionCategoryId("PreTest"),
    serial: "PERM-0018",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "REPORTS_READ",
    description: "Permite generar y visualizar reportes del sistema.",
    permissionCategory: getPermissionCategoryId("Reportes"),
    serial: "PERM-0019",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "REPORTS_WRITE",
    description: "Permite configurar y exportar reportes avanzados.",
    permissionCategory: getPermissionCategoryId("Reportes"),
    serial: "PERM-0020",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "TASKS_READ",
    description: "Permite consultar tareas asignadas a usuarios.",
    permissionCategory: getPermissionCategoryId("Tareas"),
    serial: "PERM-0021",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "TASKS_WRITE",
    description: "Permite crear, asignar y modificar tareas.",
    permissionCategory: getPermissionCategoryId("Tareas"),
    serial: "PERM-0022",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

  // Insertar permisos.
  try {
    const result = await permissions.insertMany(permissionsData);
    print(`Permisos insertados correctamente: ${result.insertedCount}`);
  } catch (error) {
    print(`Error insertando permisos: ${error.message}`);
  }

  // Verificar inserción.
  const count = await permissions.countDocuments();
  print(`Total de permisos en base de datos: ${count}`);
})();
