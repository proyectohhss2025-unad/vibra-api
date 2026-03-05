/**
 * Represents a ranking entry.
 * @property userId - The ID of the user.
 * @property score - The score of the user.
 * @property username - The username of the user.
 * @property avatar - The avatar of the user.
 * @property position - The position of the user in the ranking.
 * @example
 * {
 *   userId: 'user1',
 *   score: 100,
 *   username: 'John Doe',
 *   avatar: '  avatar: 'URL_ADDRESS.com/avatar.jpg',
 *   position: 1
 * }
 * */
export interface RankingEntry {
    userId: string;
    score: number;
    username?: string;
    avatar?: string;
    position?: number;
}

/**
 * Represents a historical ranking.
 * @property date - The date of the ranking.
 * @property topUsers - The top users in the ranking.
 * @example
 * {
 *   date: '2021-01-01',
 *   topUsers: [
 *     { userId: 'user1', score: 100 },
 *     ...
 *   ]
 * }
 * */
export interface HistoricalRanking {
    date: string;
    topUsers: RankingEntry[];
}

/**
 * Represents a live ranking update.
 * @property type - Indicates the type of update: 'fullUpdate' for a complete update or 'partialUpdate' for a partial update.
 * @property data - The updated ranking data.
 * @example
 * {
 *   type: 'fullUpdate',
 *   data: [
 *     { userId: 'user1', score: 100 },
 *     ...
 *   ]
 * }
 * */
export interface LiveRankingUpdate {
    type: 'fullUpdate' | 'partialUpdate';
    data: RankingEntry[] | Partial<RankingEntry>[];
}