// MongoDB Playground
use("vibra_db");

// Clear existing data to avoid duplicates
db.getCollection("documenttypes").deleteMany({});

// Define initial document types data
const documentTypesData = [
    {
        name: 'CC',
        description: 'Cédula de Ciudadanía',
        serial: '01',
        isActive: true,
        deleted: false,
        createdBy: 'seed',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        name: 'CE',
        description: 'Cédula de Extranjería',
        serial: '02',
        isActive: true,
        deleted: false,
        createdBy: 'seed',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        name: 'TI',
        description: 'Tarjeta de Identidad',
        serial: '03',
        isActive: true,
        deleted: false,
        createdBy: 'seed',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        name: 'NIT',
        description: 'Número de Identificación Tributaria',
        serial: '04',
        isActive: true,
        deleted: false,
        createdBy: 'seed',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        name: 'PA',
        description: 'Pasaporte',
        serial: '05',
        isActive: true,
        deleted: false,
        createdBy: 'seed',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        name: 'RC',
        description: 'Registro Civil',
        serial: '06',
        isActive: true,
        deleted: false,
        createdBy: 'seed',
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

// Insert the document types
try {
    const result = db.getCollection("documenttypes").insertMany(documentTypesData);
    print(`Successfully inserted ${result.insertedCount} document types`);
} catch (error) {
    print(`Error inserting document types: ${error.message}`);
}

// Verify insertion
const count = db.getCollection("documenttypes").countDocuments();
print(`Total document types in database: ${count}`);
