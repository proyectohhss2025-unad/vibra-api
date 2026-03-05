export interface WeeklySchedule {
    weekNumber: number;
    year: number;
    days: {
        date: Date;
        emotion: string;
        activity: string;
        status: 'pending' | 'completed' | 'skipped';
    }[];
    participants: string[];
}

