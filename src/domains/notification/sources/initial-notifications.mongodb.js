// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("vibra_db");

// Create notifications collection if it doesn't exist
db.createCollection("notifications");

// Clear existing data to avoid duplicates
db.notifications.deleteMany({});

const inboxChannelId = ObjectId("673f52a05f90c67d7b8c148d");
const infoTypeId = ObjectId("673f52025f90c67d7b8c148b");
const alertTypeId = ObjectId("673f53c15f90c67d7b8c1492");

const adminUser = db.users.findOne({ username: "admin" });

// Initial notifications data (Dashboard Vibra - participación estudiantil)
const notificationsData = [
  {
    ID: "",
    title: "Bienvenida a Vibra",
    message:
      "Bienvenido(a) al dashboard Vibra. Aquí podrás administrar la participación estudiantil, emociones y actividades.",
    isRead: false,
    user: adminUser ? adminUser._id : null,
    notificationType: infoTypeId,
    notificationChannel: inboxChannelId,
    priority: 3,
    serial: "NOT-0001",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    ID: "",
    title: "Recuerda revisar el PreTest",
    message:
      "Consulta los resultados de pre-test para identificar necesidades y orientar actividades de bienestar.",
    isRead: false,
    user: adminUser ? adminUser._id : null,
    notificationType: alertTypeId,
    notificationChannel: inboxChannelId,
    priority: 2,
    serial: "NOT-0002",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    ID: "",
    title: "Emociones y actividades activas",
    message:
      "Mantén actualizado el catálogo de emociones y las actividades para impulsar el bienestar y la participación.",
    isRead: false,
    user: null,
    notificationType: infoTypeId,
    notificationChannel: inboxChannelId,
    priority: 3,
    serial: "NOT-0003",
    isActive: true,
    deleted: false,
    createdBy: "seed",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Insert the notifications
try {
  const result = db.notifications.insertMany(notificationsData);
  print(`Successfully inserted ${result.insertedCount} notifications`);
} catch (error) {
  print(`Error inserting notifications: ${error.message}`);
}

// Verify insertion
const count = db.notifications.countDocuments();
print(`Total notifications in database: ${count}`);
