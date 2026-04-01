// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("vibra_db");

const targetDbName = "vibra_db";
const database = db.getSiblingDB(targetDbName);

const userPermissionsCollection = "userpermissions";
const usersCollection = "users";
const permissionsCollection = "permissions";

(async () => {
  if (!database.getCollectionNames().includes(usersCollection)) {
    throw new Error(
      `No existe la colección ${targetDbName}.${usersCollection}. Ejecuta primero el seed de usuarios.`,
    );
  }
  if (!database.getCollectionNames().includes(permissionsCollection)) {
    throw new Error(
      `No existe la colección ${targetDbName}.${permissionsCollection}. Ejecuta primero el seed de permisos.`,
    );
  }

  database.createCollection(userPermissionsCollection);

  const userPermissions = database.getCollection(userPermissionsCollection);
  const users = database.getCollection(usersCollection);
  const permissions = database.getCollection(permissionsCollection);

  await userPermissions.deleteMany({});

  const seedUser = "seed";
  const now = new Date();

  const adminUser = await users.findOne({ username: "admin" });
  const demoUser = await users.findOne({ username: "user.demo" });

  const permissionDocs = await permissions
    .find({}, { _id: 1, name: 1 })
    .toArray();

  const permissionIdByName = {};
  permissionDocs.forEach((p) => {
    permissionIdByName[p.name] = p._id;
  });

  const buildUserPermissions = (
    user,
    permissionNames,
    serialPrefix,
    startIndex,
  ) => {
    if (!user) return [];
    return permissionNames
      .map((permissionName, idx) => {
        const permissionId = permissionIdByName[permissionName];
        if (!permissionId) return null;
        const serialIndex = String(startIndex + idx).padStart(4, "0");
        return {
          user: user._id,
          permission: permissionId,
          serial: `${serialPrefix}-${serialIndex}`,
          isActive: true,
          deleted: false,
          createdBy: seedUser,
          createdAt: now,
          updatedAt: now,
        };
      })
      .filter(Boolean);
  };

  const adminPermissionNames = Object.keys(permissionIdByName);
  const demoPermissionNames = [
    "USERS_READ",
    "ACTIVITIES_READ",
    "EMOTIONS_READ",
    "PRETEST_READ",
    "NOTIFICATIONS_READ",
  ];

  const userPermissionsData = [
    ...buildUserPermissions(adminUser, adminPermissionNames, "UPERM", 1),
    ...buildUserPermissions(demoUser, demoPermissionNames, "UPERM", 1000),
  ];

  try {
    const result = await userPermissions.insertMany(userPermissionsData);
    print(`Successfully inserted ${result.insertedCount} user permissions`);
  } catch (error) {
    print(`Error inserting user permissions: ${error.message}`);
  }

  const count = await userPermissions.countDocuments();
  print(`Total user permissions in database: ${count}`);
})();
