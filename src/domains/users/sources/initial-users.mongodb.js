// MongoDB Playground
// Base de datos actual a usar.
use("vibra_db");

// Crear colección de usuarios si no existe.
db.createCollection("users");

// Limpiar datos existentes para evitar duplicados.
db.users.deleteMany({});

// Obtener roles existentes para asignarlos a los usuarios.
// Este seed asume que ya se ejecutó: src/domains/roles/sources/initial-roles.mongodb.js
const superAdminRole = db.roles.findOne({ name: "Super Admin" });
const userRole = db.roles.findOne({ name: "Administrador" });

if (!superAdminRole || !userRole) {
  throw new Error(
    "No se encontraron roles base. Ejecuta primero el seed de roles (initial-roles.mongodb.js).",
  );
}

// Hashes bcrypt pre-generados con bcrypt.hashSync(password, 10).
// IMPORTANTE: Cambiar estas contraseñas en el primer despliegue.
const adminPasswordHash =
  "$2b$10$Aj6zYfbRa4TAhoFZ/JY1/Ov8VE4366IzOtyhSChpifiKzTOGZvMhe"; // Vibra@2026!
const userPasswordHash =
  "$2b$10$tlDMXiO.EWUgmZYqXUluLOICMvEi/NhDrspZ326YrKhB2nfy3/6m2"; // User@2026!

// Datos iniciales de usuarios.
// Nota: El esquema de User incluye campos adicionales (empresa, dirección, etc.) que se dejan vacíos en este seed.
const usersData = [
  {
    name: "Administrador Vibra",
    username: "admin",
    password: adminPasswordHash,
    documentNumber: "6803296",
    documentType: "CC",
    email: "admin@vibra.local",
    keepSessionActive: true,
    role: superAdminRole._id,
    avatar: "default-admin.png",
    gender: "MALE",
    isLogged: false,
    totalScore: 0,
    serial: "USR-0001",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Usuario Administrador",
    username: "user.demo",
    password: userPasswordHash,
    documentNumber: "1000000002",
    documentType: "CC",
    email: "user.demo@vibra.local",
    keepSessionActive: false,
    role: userRole._id,
    avatar: "default-user.png",
    gender: "MALE",
    isLogged: false,
    totalScore: 0,
    serial: "USR-0002",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Insertar usuarios.
try {
  const result = db.users.insertMany(usersData);
  print(`Usuarios insertados correctamente: ${result.insertedCount}`);
} catch (error) {
  print(`Error insertando usuarios: ${error.message}`);
}

// Verificar inserción.
const count = db.users.countDocuments();
print(`Total de usuarios en base de datos: ${count}`);
