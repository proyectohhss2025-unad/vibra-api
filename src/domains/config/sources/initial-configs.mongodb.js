// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("vibra_db");

// Create configs collection if it doesn't exist
db.createCollection("configs");

// Clear existing data to avoid duplicates
db.configs.deleteMany({});

const allowedUsers = ["6803296", "1080931527"];
const disallowedUsers = ["0000000", "1111111"];

// Initial configs data
const configsData = [
  {
    _id: ObjectId("6663674b5d58c8a6a2bc67ce"),
    name: "API-Documentation-Access",
    description:
      "Controla el acceso a la documentación del API (whitelist por documentNumber).",
    serial: "CFG-0001",
    flag: true,
    isActive: true,
    allowedUsers,
    disallowedUsers,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId("66509c3a56fa46b3d178e2a9"),
    name: "Login-OTP-Exempt",
    description:
      "Los usuarios en allowedUsers no requieren OTP durante el inicio de sesión.",
    serial: "CFG-0002",
    flag: true,
    isActive: true,
    allowedUsers,
    disallowedUsers,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId("665536e38c716c7e190822a2"),
    name: "Sidebar-Online-Users",
    description:
      "Muestra el listado de usuarios en línea para los usuarios permitidos.",
    serial: "CFG-0003",
    flag: true,
    isActive: true,
    allowedUsers,
    disallowedUsers,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: ObjectId("67781bb2f426d18e161d1345"),
    name: "Transactions-Modules",
    description:
      "Habilita los módulos de Transacciones (Emociones/Actividades) en el menú del dashboard.",
    serial: "CFG-0004",
    flag: true,
    isActive: true,
    allowedUsers,
    disallowedUsers,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Insert the configs
try {
  const result = db.configs.insertMany(configsData);
  print(`Successfully inserted ${result.insertedCount} configs`);
} catch (error) {
  print(`Error inserting configs: ${error.message}`);
}

// Verify insertion
const count = db.configs.countDocuments();
print(`Total configs in database: ${count}`);
