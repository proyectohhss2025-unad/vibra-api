// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("vibra");

// Create policies collection if it doesn't exist
db.createCollection("policies");

// Clear existing data to avoid duplicates
db.policies.deleteMany({});

// Initial policies data
const policiesData = [
    {
        title: "Privacy Policy",
        content: "This Privacy Policy describes how we collect, use, and handle your personal information when you use our services. We are committed to protecting your privacy and ensuring you understand how your data is managed.",
        version: "1.0.0",
        isActive: true,
        type: "PRIVACY",
        effectiveDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "Terms of Service",
        content: "These Terms of Service (\"Terms\") govern your access to and use of our services. By using our services, you agree to be bound by these terms. Please read them carefully.",
        version: "1.0.0",
        isActive: true,
        type: "TERMS",
        effectiveDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        title: "Cookie Policy",
        content: "Our Cookie Policy explains how we use cookies and similar tracking technologies to recognize you when you visit our website. It explains what these technologies are and why we use them.",
        version: "1.0.0",
        isActive: true,
        type: "COOKIES",
        effectiveDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

// Insert the policies
try {
    const result = db.policies.insertMany(policiesData);
    print(`Successfully inserted ${result.insertedCount} policies`);
} catch (error) {
    print(`Error inserting policies: ${error.message}`);
}

// Verify insertion
const count = db.policies.countDocuments();
print(`Total policies in database: ${count}`);
