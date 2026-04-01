// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("vibra_db");

// Create notificationchannels collection if it doesn't exist
db.createCollection("notificationchannels");

// Clear existing data to avoid duplicates
db.notificationchannels.deleteMany({});

// Initial notification channels data (IDs aligned with src/utils/constants.ts)
const notificationChannelsData = [
  {
    _id: ObjectId("673f52a05f90c67d7b8c148d"),
    title: "Inbox",
    description: "Canal interno del dashboard (bandeja de notificaciones).",
    level: 1,
    serial: "NCHN-0001",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId("673f53755f90c67d7b8c148e"),
    title: "Email",
    description: "Canal de notificaciones por correo electrónico.",
    level: 2,
    serial: "NCHN-0002",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId("673f538f5f90c67d7b8c148f"),
    title: "CMS",
    description:
      "Canal para integración con CMS o mensajería interna de contenidos.",
    level: 3,
    serial: "NCHN-0003",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId("673f53a25f90c67d7b8c1490"),
    title: "WhatsApp",
    description: "Canal para notificaciones vía WhatsApp (si aplica).",
    level: 4,
    serial: "NCHN-0004",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Insert the notification channels
try {
  const result = db.notificationchannels.insertMany(notificationChannelsData);
  print(`Successfully inserted ${result.insertedCount} notification channels`);
} catch (error) {
  print(`Error inserting notification channels: ${error.message}`);
}

// Verify insertion
const count = db.notificationchannels.countDocuments();
print(`Total notification channels in database: ${count}`);
