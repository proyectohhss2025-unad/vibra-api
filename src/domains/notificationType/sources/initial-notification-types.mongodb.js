// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("vibra_db");

// Create notificationtypes collection if it doesn't exist
db.createCollection("notificationtypes");

// Clear existing data to avoid duplicates
db.notificationtypes.deleteMany({});

// Initial notification types data (IDs aligned with src/utils/constants.ts)
const notificationTypesData = [
  {
    _id: ObjectId("673f52025f90c67d7b8c148b"),
    title: "Info",
    description:
      "Mensajes informativos del dashboard de participación estudiantil (Vibra).",
    level: 1,
    serial: "NTYP-0001",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId("673f53c15f90c67d7b8c1492"),
    title: "Alert",
    description:
      "Alertas y recordatorios importantes para usuarios y administradores.",
    level: 2,
    serial: "NTYP-0002",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId("673f541d5f90c67d7b8c1493"),
    title: "Error",
    description:
      "Notificaciones de error o inconsistencias detectadas en procesos.",
    level: 3,
    serial: "NTYP-0003",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Insert the notification types
try {
  const result = db.notificationtypes.insertMany(notificationTypesData);
  print(`Successfully inserted ${result.insertedCount} notification types`);
} catch (error) {
  print(`Error inserting notification types: ${error.message}`);
}

// Verify insertion
const count = db.notificationtypes.countDocuments();
print(`Total notification types in database: ${count}`);
