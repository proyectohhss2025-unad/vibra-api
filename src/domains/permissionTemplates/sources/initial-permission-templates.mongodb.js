// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("vibra_db");

const targetDbName = "vibra_db";
const database = db.getSiblingDB(targetDbName);

const permissionCollection = "permissions";
const permissionTemplateCollection = "permissiontemplates";

(async () => {
  if (!database.getCollectionNames().includes(permissionCollection)) {
    throw new Error(
      `No existe la colección ${targetDbName}.${permissionCollection}. Ejecuta primero el seed de permisos.`,
    );
  }

  database.createCollection(permissionTemplateCollection);
  const permissionTemplates = database.getCollection(permissionTemplateCollection);
  const permissions = database.getCollection(permissionCollection);

  await permissionTemplates.deleteMany({});

  const permissionDocs = await permissions
    .find({}, { _id: 1, name: 1 })
    .toArray();

  if (!permissionDocs || permissionDocs.length === 0) {
    throw new Error(
      `No se encontraron permisos en ${targetDbName}.${permissionCollection}. Ejecuta el seed de permisos antes de crear plantillas.`,
    );
  }

  const permissionsByName = {};
  permissionDocs.forEach((perm) => {
    permissionsByName[perm.name] = perm._id;
  });

  const getPermissionId = (name) => permissionsByName[name];

  const allPermissionIds = Object.values(permissionsByName);

  const docentePermissionIds = [
    getPermissionId("USERS_READ"),
    getPermissionId("ACTIVITIES_READ"),
    getPermissionId("EMOTIONS_READ"),
    getPermissionId("PRETEST_READ"),
    getPermissionId("REPORTS_READ"),
    getPermissionId("TASKS_READ"),
    getPermissionId("NOTIFICATIONS_READ"),
  ].filter(Boolean);

  const estudiantePermissionIds = [
    getPermissionId("ACTIVITIES_READ"),
    getPermissionId("EMOTIONS_READ"),
    getPermissionId("PRETEST_READ"),
    getPermissionId("NOTIFICATIONS_READ"),
  ].filter(Boolean);

  const now = new Date();

  // Initial permission templates data (Dashboard Vibra - participación estudiantil)
  const permissionTemplatesData = [
    {
      name: "Administrador Vibra",
      description:
        "Plantilla completa para administración del dashboard de participación estudiantil (Vibra).",
      permissions: allPermissionIds,
      serial: "PTPL-0001",
      isActive: true,
      deleted: false,
      createdBy: "seed",
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "Docente Vibra",
      description:
        "Plantilla para docentes: consulta de usuarios, actividades, emociones, pretest, reportes y tareas.",
      permissions: docentePermissionIds,
      serial: "PTPL-0002",
      isActive: true,
      deleted: false,
      createdBy: "seed",
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "Estudiante Vibra",
      description:
        "Plantilla base para estudiantes: lectura de actividades, emociones y consulta de resultados.",
      permissions: estudiantePermissionIds,
      serial: "PTPL-0003",
      isActive: true,
      deleted: false,
      createdBy: "seed",
      createdAt: now,
      updatedAt: now,
    },
  ];

  try {
    const result = await permissionTemplates.insertMany(permissionTemplatesData);
    print(`Successfully inserted ${result.insertedCount} permission templates`);
  } catch (error) {
    print(`Error inserting permission templates: ${error.message}`);
  }

  const count = await permissionTemplates.countDocuments();
  print(`Total permission templates in database: ${count}`);
})();
