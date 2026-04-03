// MongoDB Playground
use("vibra_db");

// Create participant collection if it doesn't exist
db.createCollection("participants");

// Clear existing data to avoid duplicates
db.participants.deleteMany({});

// Define the initial participants data

const participantsData = [
    {
        userId: '65f1a2b3c4d5e6f700000001',
        name: 'Andrés Felipe Restrepo',
        nickname: 'af_restrepo',
        nit: '1017123456',
        points: 450,
        preferences: { language: 'Spanish', notifications: true },
        epsCode: 'SURA01',
        address: 'Calle 10 # 43-20, Medellín',
        phoneNumber: '3101234567',
        email: 'andres.restrepo@email.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Andres',
        createdBy: 'seed',
        isParticular: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        userId: '65f1a2b3c4d5e6f700000002',
        name: 'Marcela Hoyos Zuluaga',
        nickname: 'marce_hz',
        nit: '52888999',
        points: 125,
        preferences: { language: 'Spanish', notifications: false },
        epsCode: 'EPS002',
        address: 'Carrera 70 # 10-45, Bogota',
        phoneNumber: '3001112233',
        email: 'marcela.hoyos@email.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcela',
        createdBy: 'seed',
        isParticular: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        userId: '65f1a2b3c4d5e6f700000003',
        name: 'Camilo Torres Rada',
        nickname: 'ctorres_pro',
        nit: '1032444555',
        points: 890,
        preferences: { language: 'Spanish', notifications: true },
        epsCode: 'EPS005',
        address: 'Calle 50 # 20-10, Cali',
        phoneNumber: '3156667788',
        email: 'camilo.torres@email.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Camilo',
        createdBy: 'seed',
        isParticular: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        userId: '65f1a2b3c4d5e6f700000004',
        name: 'Lucía Méndez Silva',
        nickname: 'lucia_ms',
        nit: '32444555',
        points: 60,
        preferences: { language: 'English', notifications: true },
        address: 'Avenida 15 # 100-24, Bogota',
        phoneNumber: '3104445566',
        email: 'lucia.mendez@email.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucia',
        createdBy: 'seed',
        isParticular: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        userId: '65f1a2b3c4d5e6f700000005',
        name: 'Roberto Gómez Bolaños',
        nickname: 'chespirito',
        nit: '11223344',
        points: 1200,
        preferences: { language: 'Spanish', notifications: true },
        address: 'Calle de la Vecindad # 72',
        phoneNumber: '3112223344',
        email: 'roberto.gomez@email.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto',
        createdBy: 'seed',
        isParticular: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        userId: '65f1a2b3c4d5e6f700000006',
        name: 'Laura Sofía Castro',
        nickname: 'laura_sc',
        nit: '1010202030',
        points: 30,
        preferences: { language: 'Spanish', notifications: false },
        address: 'Carrera 45 # 30-15, Barranquilla',
        phoneNumber: '3209998877',
        email: 'laura.castro@email.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Laura',
        createdBy: 'seed',
        isParticular: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        userId: '65f1a2b3c4d5e6f700000007',
        name: 'Javier Darío Marín',
        nickname: 'jd_marin',
        nit: '79444555',
        points: 2500,
        preferences: { language: 'Spanish', notifications: true },
        address: 'Calle 140 # 20-30, Bogota',
        phoneNumber: '3153334455',
        email: 'javier.marin@email.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Javier',
        createdBy: 'seed',
        isParticular: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        userId: '65f1a2b3c4d5e6f700000008',
        name: 'Elena Rose Granados',
        nickname: 'elena_rose',
        nit: '1055566677',
        points: 210,
        preferences: { language: 'Spanish', notifications: true },
        address: 'Carrera 15 # 127-10, Bogota',
        phoneNumber: '3117776655',
        email: 'elena.rose@email.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
        createdBy: 'seed',
        isParticular: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        userId: '65f1a2b3c4d5e6f700000009',
        name: 'Santi Trujillo G.',
        nickname: 'santi_tg',
        nit: '10999888',
        points: 150,
        preferences: { language: 'Spanish', notifications: false },
        address: 'Calle 8 Sur # 35-12, Medellín',
        phoneNumber: '3204441122',
        email: 'santi.trujillo@email.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Santi',
        createdBy: 'seed',
        isParticular: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        userId: '65f1a2b3c4d5e6f700000010',
        name: 'Patricia Fernández',
        nickname: 'la_peliteñida',
        nit: '43555666',
        points: 500,
        preferences: { language: 'Spanish', notifications: true },
        address: 'Av. Caracas # 45-60, Bogota',
        phoneNumber: '3122223344',
        email: 'patricia.fernandez@email.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Patricia',
        createdBy: 'seed',
        isParticular: true,
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

// Insert the participants
try {
    const result = db.participants.insertMany(participantsData);
    print(`Successfully inserted ${result.insertedCount} participants`);
} catch (error) {
    print(`Error inserting participants: ${error.message}`);
}

// Verify insertion
const count = db.participants.countDocuments();
print(`Total participants in database: ${count}`);
