// MongoDB Playground
use("vibra_db");

// Create participant collection if it doesn't exist
db.createCollection("participants");

// Clear existing data to avoid duplicates
db.participants.deleteMany({});

// Define the initial participants data

const participantsData = [
    {
        id: '1',
        name: 'Ana López',
        email: 'ana.lopez@email.com',
        createdAt: new Date('2025-03-01T10:00:00Z'),
        lastLogin: new Date('2025-03-12T08:30:00Z'),
        points: 45,
        completedActivities: ['1'],
        preferences: {
            language: 'Spanish',
            notifications: true
        }
    },
    {
        id: '2',
        name: 'Carlos Ruiz',
        email: 'carlos.ruiz@email.com',
        createdAt: new Date('2025-03-02T14:15:00Z'),
        lastLogin: new Date('2025-03-11T16:45:00Z'),
        points: 12,
        completedActivities: [],
        preferences: {
            language: 'Spanish',
            notifications: false
        }
    },
    {
        id: '3',
        name: 'María González',
        email: 'maria.gonzalez@email.com',
        createdAt: new Date('2025-03-03T09:30:00Z'),
        lastLogin: new Date('2025-03-12T12:00:00Z'),
        points: 78,
        completedActivities: ['1', '2'],
        preferences: {
            language: 'Spanish',
            notifications: true
        }
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
