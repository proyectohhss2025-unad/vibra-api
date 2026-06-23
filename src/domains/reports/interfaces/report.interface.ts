export interface KpiReport {
  totalResponses: number;
  uniqueUsers: number;
  avgScore: number;
  avgTimeMinutes: number;
  totalScore: number;
  todayResponses: number;
  activeActivities: number;
}

export interface ActivityReportItem {
  activityId: string;
  activityTitle: string;
  emotionId: string;
  emotionName?: string;
  emotionIcon?: string;
  difficulty: number;
  scheduleDate: string;
  totalResponses: number;
  uniqueUsersCount: number;
  avgScore: number;
  avgTimeSeconds: number;
}

export interface UserReportItem {
  userId: string;
  userName: string;
  email: string;
  totalResponses: number;
  totalScore: number;
  avgScore: number;
  totalTimeSeconds: number;
  level: string;
  currentStreak: number;
  lastActivityDate: string;
}

export interface EmotionReportItem {
  emotionId: string;
  emotionName: string;
  emotionCategory: string;
  emotionIcon: string;
  totalResponses: number;
  uniqueUsersCount: number;
  distinctActivitiesCount: number;
  avgScore: number;
}

export interface TrendPoint {
  date: string;
  totalResponses: number;
  uniqueUsersCount: number;
  avgScore: number;
}

export interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface UserProfile {
  user: {
    _id: string;
    name: string;
    email: string;
    documentNumber: string;
    avatar?: string;
  };
  participant: {
    nickname: string;
    points: number;
    level: string;
    currentStreak: number;
    maxStreak: number;
    totalActivitiesCompleted: number;
    lastActivityDate?: string;
  };
  stats: {
    avgScore: number;
    totalScore: number;
    totalTimeMinutes: number;
    totalResponses: number;
  };
  recentActivity: {
    activityTitle: string;
    score: number;
    date: string;
  }[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
