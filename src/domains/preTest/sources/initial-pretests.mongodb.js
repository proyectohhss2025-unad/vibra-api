// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("vibra_db");

// Create pretests collection if it doesn't exist
db.createCollection("pretests");

// Clear existing data to avoid duplicates
db.pretests.deleteMany({});

// Initial pretest results data (Dashboard Vibra - participación estudiantil)
// Nota: En el esquema actual, userId es string. Se utiliza documentNumber para mantener coherencia con el dashboard.
const preTestsData = [
  {
    testId: "PRETEST-BASELINE-EMOTIONS",
    userId: "6803296",
    responses: [
      { questionId: "Q1", answer: "Frecuentemente", points: 3 },
      { questionId: "Q2", answer: "A veces", points: 2 },
      { questionId: "Q3", answer: "Rara vez", points: 1 },
    ],
    totalScore: 6,
  },
  {
    testId: "PRETEST-BASELINE-EMOTIONS",
    userId: "1000000002",
    responses: [
      { questionId: "Q1", answer: "A veces", points: 2 },
      { questionId: "Q2", answer: "A veces", points: 2 },
      { questionId: "Q3", answer: "Frecuentemente", points: 3 },
    ],
    totalScore: 7,
  },
];

// Insert the pretests
try {
  const result = db.pretests.insertMany(preTestsData);
  print(`Successfully inserted ${result.insertedCount} pretests`);
} catch (error) {
  print(`Error inserting pretests: ${error.message}`);
}

// Verify insertion
const count = db.pretests.countDocuments();
print(`Total pretests in database: ${count}`);
