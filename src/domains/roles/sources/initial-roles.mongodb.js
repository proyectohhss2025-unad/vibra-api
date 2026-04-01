// MongoDB Playground
// Base de datos actual a usar.
use("vibra_db");

const targetDbName = "vibra_db";
const database = db.getSiblingDB(targetDbName);

const roleCollection = "roles";
const permissionTemplateCollection = "permissiontemplates";

(async () => {
  if (!database.getCollectionNames().includes(permissionTemplateCollection)) {
    throw new Error(
      `No existe la colección ${targetDbName}.${permissionTemplateCollection}. Ejecuta primero el seed de plantillas de permisos.`,
    );
  }

  database.createCollection(roleCollection);
  const roles = database.getCollection(roleCollection);
  const permissionTemplates = database.getCollection(permissionTemplateCollection);

  await roles.deleteMany({});

  const templateDocs = await permissionTemplates
    .find({}, { _id: 1, name: 1 })
    .toArray();

  const permissionTemplateByName = {};
  templateDocs.forEach((template) => {
    permissionTemplateByName[template.name] = template._id;
  });

  const getPermissionTemplateId = (name) => permissionTemplateByName[name] || null;

  const requiredTemplates = ["Administrador Vibra", "Docente Vibra", "Estudiante Vibra"];
  const missingTemplates = requiredTemplates.filter(
    (name) => !getPermissionTemplateId(name),
  );
  if (missingTemplates.length > 0) {
    throw new Error(
      `Faltan plantillas requeridas para asociar roles: ${missingTemplates.join(", ")}`,
    );
  }

  const now = new Date();

  const rolesData = [
    {
      name: "Super Admin",
      description:
        "Rol con acceso total a todas las funcionalidades del sistema.",
      isSuperAdmin: true,
      permissionTemplate: getPermissionTemplateId("Administrador Vibra"),
      serial: "ROLE-0001",
      isActive: true,
      deleted: false,
      createdBy: "seed",
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "Administrador",
      description:
        "Rol para administración del dashboard y operación institucional.",
      isSuperAdmin: false,
      permissionTemplate: getPermissionTemplateId("Administrador Vibra"),
      serial: "ROLE-0002",
      isActive: true,
      deleted: false,
      createdBy: "seed",
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "Docente",
      description: "Rol para docentes (seguimiento y acompañamiento).",
      isSuperAdmin: false,
      permissionTemplate: getPermissionTemplateId("Docente Vibra"),
      serial: "ROLE-0003",
      isActive: true,
      deleted: false,
      createdBy: "seed",
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "Estudiante",
      description: "Rol para estudiantes (participación y bienestar).",
      isSuperAdmin: false,
      permissionTemplate: getPermissionTemplateId("Estudiante Vibra"),
      serial: "ROLE-0004",
      isActive: true,
      deleted: false,
      createdBy: "seed",
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "Profesional de la psicología",
      description:
        "Rol para psicología: acompañamiento y análisis de resultados.",
      isSuperAdmin: false,
      permissionTemplate: getPermissionTemplateId("Docente Vibra"),
      serial: "ROLE-0005",
      isActive: true,
      deleted: false,
      createdBy: "seed",
      createdAt: now,
      updatedAt: now,
    },
  ];

  try {
    const result = await roles.insertMany(rolesData);
    print(`Roles insertados correctamente: ${result.insertedCount}`);
  } catch (error) {
    print(`Error insertando roles: ${error.message}`);
  }

  const count = await roles.countDocuments();
  print(`Total de roles en base de datos: ${count}`);
})();
