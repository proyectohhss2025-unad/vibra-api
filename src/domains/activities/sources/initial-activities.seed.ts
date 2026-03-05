import { Types } from 'mongoose';
import { Activity } from '../schemas/activity.schema';

export const initialActivities: any[] = [
    {
        id: '1',
        emotion: new Types.ObjectId('67d22641649286446e0e8477'),
        title: 'Felicidad',
        resources: [
            {
                type: 'video',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                duration: 300,
                metadata: {
                    author: 'Jane Doe',
                    language: 'English'
                }
            }
        ],
        questions: [
            {
                questionText: 'What are three things you\'re grateful for today?',
                type: 'open',
                points: 10
            },
            {
                questionText: 'How does gratitude affect your mood?',
                type: 'multiple',
                options: ['Very Positively', 'Somewhat Positively', 'No Effect', 'Negatively'],
                correctAnswer: 'Very Positively',
                points: 5
            }
        ],
        difficulty: 1,
        isActive: true,
        schedule: {
            date: new Date('2025-03-12'),
            weekNumber: 2,
            year: 2025
        },
        createdAt: new Date('2025-03-13T12:00:00Z')
    },
    {
        id: '2',
        emotion: new Types.ObjectId('67d22641649286446e0e8478'),
        title: 'Tristeza',
        resources: [
            {
                type: 'audio',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                duration: 600,
                metadata: {
                    technique: '4-7-8 breathing',
                    background: 'ocean waves'
                }
            }
        ],
        questions: [
            {
                questionText: 'How do you feel after the exercise?',
                type: 'multiple',
                options: ['Very Relaxed', 'Somewhat Relaxed', 'No Change', 'More Tense'],
                correctAnswer: 'Very Relaxed',
                points: 5
            }
        ],
        difficulty: 2,
        isActive: true,
        schedule: {
            date: new Date('2025-03-12'),
            weekNumber: 2,
            year: 2025
        },
        createdAt: new Date('2025-03-14T12:00:00Z')
    },
    {
        id: '3',
        emotion: new Types.ObjectId('67d22641649286446e0e847b'),
        title: 'Ansiedad',
        resources: [
            {
                type: 'video',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                duration: 450,
                metadata: {
                    category: 'self-care',
                    intensity: 'moderate'
                }
            }
        ],
        questions: [
            {
                questionText: 'What\'s the most important thing you need to do today?',
                type: 'open',
                points: 10
            },
            {
                questionText: 'Which activity resonated with you the most?',
                type: 'open',
                points: 10
            } as any
        ],
        difficulty: 3,
        isActive: true,
        schedule: {
            date: new Date('2025-03-12'),
            weekNumber: 2,
            year: 2025
        },
        createdAt: new Date('2025-03-15T12:00:00Z')
    }
] as unknown as any[];

export async function seedActivities(activityModel: any): Promise<void> {
    try {
        await activityModel.deleteMany({});

        const activitiesToInsert = initialActivities.map(activity => ({
            ...activity,
            _id: new Types.ObjectId(),
            questions: activity.questions?.map(question => ({
                ...question
            })),
            resources: activity.resources?.map(resource => ({
                ...resource
            }))
        }));

        const result = await activityModel.insertMany(activitiesToInsert);
        console.log(`Successfully inserted ${result.length} activities`);

        const count = await activityModel.countDocuments();
        console.log(`Total activities in database: ${count}`);
    } catch (error) {
        console.error('Error seeding activities:', error);
        throw error;
    }
}