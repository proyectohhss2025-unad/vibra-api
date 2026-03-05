// MongoDB Playground
use("vibra");

// Create emotions collection if it doesn't exist
db.createCollection("emotions");

// Clear existing data to avoid duplicates
db.emotions.deleteMany({});

// Initial emotions data
const emotionsData = [
    {
        id: "joy",
        name: "Alegría",
        orientationNote: "Enfócate en mantener y compartir este sentimiento positivo",
        description: "Sentimiento de placer y felicidad",
        icono: "😊",
        percentNote: 0
    },
    {
        id: "sadness",
        name: "Tristeza",
        orientationNote: "Permítete sentir y procesar tus emociones",
        description: "Sentimiento de pena o melancolía",
        icono: "😢",
        percentNote: 0
    },
    {
        id: "anger",
        name: "Enojo",
        orientationNote: "Busca formas saludables de canalizar esta emoción",
        description: "Sentimiento de molestia o irritación intensa",
        icono: "😠",
        percentNote: 0
    },
    {
        id: "fear",
        name: "Miedo",
        orientationNote: "Identifica la fuente de tu temor y evalúa si es real",
        description: "Sensación de amenaza o peligro",
        icono: "😨",
        percentNote: 0
    },
    {
        id: "anxiety",
        name: "Ansiedad",
        orientationNote: "Practica ejercicios de respiración y mindfulness",
        description: "Sensación de preocupación o nerviosismo",
        icono: "😰",
        percentNote: 0
    },
    {
        id: "love",
        name: "Amor",
        orientationNote: "Cultiva relaciones saludables y el autocuidado",
        description: "Sentimiento de afecto profundo",
        icono: "❤️",
        percentNote: 0
    },
    {
        id: "gratitude",
        name: "Gratitud",
        orientationNote: "Practica el reconocimiento diario de lo positivo",
        description: "Sentimiento de apreciación y reconocimiento",
        icono: "🙏",
        percentNote: 0
    },
    {
        id: "hope",
        name: "Esperanza",
        orientationNote: "Mantén una visión positiva del futuro",
        description: "Sentimiento de optimismo hacia el futuro",
        icono: "🌟",
        percentNote: 0
    },
    {
        id: "frustration",
        name: "Frustración",
        orientationNote: "Divide tus metas en pasos más pequeños",
        description: "Sentimiento de impotencia ante obstáculos",
        icono: "😤",
        percentNote: 0
    },
    {
        id: "excitement",
        name: "Entusiasmo",
        orientationNote: "Canaliza esta energía en acciones productivas",
        description: "Sentimiento de emoción y anticipación positiva",
        icono: "🤩",
        percentNote: 0
    },
    {
        id: "peace",
        name: "Paz",
        orientationNote: "Mantén las prácticas que te traen tranquilidad",
        description: "Sensación de calma y tranquilidad",
        icono: "😌",
        percentNote: 0
    },
    {
        id: "confusion",
        name: "Confusión",
        orientationNote: "Toma tiempo para organizar tus pensamientos",
        description: "Sensación de desorden mental o incertidumbre",
        icono: "😕",
        percentNote: 0
    },
    {
        id: "loneliness",
        name: "Soledad",
        orientationNote: "Busca conexiones significativas con otros",
        description: "Sentimiento de aislamiento o desconexión",
        icono: "😔",
        percentNote: 0
    },
    {
        id: "pride",
        name: "Orgullo",
        orientationNote: "Celebra tus logros manteniendo la humildad",
        description: "Sentimiento de satisfacción por logros",
        icono: "🦁",
        percentNote: 0
    },
    {
        id: "curiosity",
        name: "Curiosidad",
        orientationNote: "Explora y aprende de forma segura",
        description: "Deseo de descubrir y aprender",
        icono: "🤔",
        percentNote: 0
    }
];

// Insert the emotions
try {
    const result = db.emotions.insertMany(emotionsData);
    print(`Successfully inserted ${result.insertedCount} emotions`);
} catch (error) {
    print(`Error inserting emotions: ${error.message}`);
}

// Verify insertion
const count = db.emotions.countDocuments();
print(`Total emotions in database: ${count}`);