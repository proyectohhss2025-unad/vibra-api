// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("vibra_db");

// Create companies collection if it doesn't exist
db.createCollection("companies");

// Clear existing data to avoid duplicates
db.companies.deleteMany({});

// Initial companies data with valid values based on the create-company.dto.ts schema
const companiesData = [
    {
        id: "1",
        name: "Instituto Tecnológico Del Caquetá",
        slogan: "El mejor Instituto para el desarrollo tecnológico.",
        nit: "9876543210987",
        address: "Calle Mayor 123, Florencia, Caquetá, Colombia",
        email: "contacto@tecnologico.com",
        phoneNumber: "+598 345 678 901",
        managerData: {
            name: "Juan Pérez",
            documentType: ObjectId("67d22641649286446e0e8477"),
            document: "V-01001",
            email: "juan.perez@vibra.com",
            phoneNumber: "+598 345 678 902"
        },
        seriesCurrentBillingRange: "01/2025-12/2026",
        createdBy: "admin",
        isMain: true,
        userAdmin: "admin_user"
    },
    {
        id: "2",
        name: "Colegio Amazónico de Artes Agropecuarias",
        slogan: "La mejor escuela para el arte agropecuario.",
        nit: "9876543210987",
        address: "Calle Principal de la Ciudad, Florencia, Caquetá, Colombia",
        email: "info@amazonico.com",
        phoneNumber: "+598 345 678 903",
        managerData: {
            name: "Ana Sánchez",
            documentType: ObjectId("67d22641649286446e0e8478"),
            document: "V-01002",
            email: "ana.sanchez@vibra.com",
            phoneNumber: "+598 345 678 904"
        },
        seriesCurrentBillingRange: "02/2025-12/2027",
        createdBy: "admin",
        isMain: false,
        userAdmin: "admin_user"
    }
];

// Insert the companies
try {
    const result = db.companies.insertMany(companiesData);
    print(`Successfully inserted ${result.insertedCount} companies`);
} catch (error) {
    print(`Error inserting companies: ${error.message}`);
}

// Verify insertion
const count = db.companies.countDocuments();
print(`Total companies in database: ${count}`);