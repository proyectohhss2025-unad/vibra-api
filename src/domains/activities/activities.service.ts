import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserResponse } from 'src/domains/userResponses/schemas/userResponse.schema';
import { AppLoggerService } from 'src/helpers/logger/logger.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ActivityResponseDto } from './dto/activity-response.dto';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';
import { Activity } from './schemas/activity.schema';
import { WeeklySchedule } from './schemas/weekly-schedule.schema';

@Injectable()
export class ActivitiesService {
    constructor(
        @InjectModel(Activity.name) private activityModel: Model<Activity>,
        @InjectModel('WeeklySchedule') private weeklyScheduleModel: Model<WeeklySchedule>,
        @InjectModel(UserResponse.name) private userResponseModel: Model<UserResponse>,
        private readonly logger: AppLoggerService,
    ) { }

    async create(createActivityDto: CreateActivityDto): Promise<Activity> {
        const createdActivity = new this.activityModel(createActivityDto);
        return createdActivity.save();
    }

    async paginate(
        options: PaginationQueryDto,
        userId: string,
        query: any = {},
    ): Promise<{ docs: Activity[]; totalDocs: number; userResponse: UserResponse[], page: number; limit: number }> {
        const { page = 1, limit = 10 } = options;
        const skip = (page - 1) * limit;

        const baseQuery = { isActive: true, ...query };

        //console.log('baseQuery: ', userId);

        const [docs, totalDocs, userResponse] = await Promise.all([
            this.activityModel
                .find(baseQuery)
                .populate('emotion')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.activityModel.countDocuments(baseQuery).exec(),
            userId ? this.userResponseModel.find({ user: new Types.ObjectId(userId) })
                .populate('activity')
                .populate('user')
                .lean()
                .exec() : Promise.resolve([])
        ])
        //console.log('userResponse: ', userResponse);
        return {
            docs,
            totalDocs,
            userResponse,
            page,
            limit
        };
    }

    async findById(id: string): Promise<Activity> {
        return this.activityModel.findById(id).exec();
    }

    async update(id: string, updateActivityDto: UpdateActivityDto): Promise<Activity> {
        return this.activityModel.findByIdAndUpdate(
            id,
            { $set: updateActivityDto },
            { new: true }
        ).exec();
    }

    async softDelete(id: string): Promise<Activity> {
        return this.activityModel.findByIdAndUpdate(
            id,
            { $set: { isActive: false } },
            { new: true }
        ).exec();
    }

    async getAvailableEmotions(): Promise<string[]> {
        return this.activityModel.find()
            .populate('emotion')
            .distinct('emotion')
            .exec().then(emotions => emotions.map((emotion: any) => emotion._id.toString()));
    }

    async getRandomEmotions(count: number): Promise<string[]> {
        const emotions = await this.getAvailableEmotions();
        return this.shuffleArray(emotions).slice(0, count);
    }

    async getTodaysActivity(): Promise<any> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const activity = await this.activityModel.findOne({
            isActive: true,
            $or: [
                { createdAt: { $gte: today, $lt: tomorrow } }
            ]
        })
            .populate('emotion')
            .exec();

        this.logger.log(`Getting a new activity...${JSON.stringify(activity)}`);

        return {
            activity,
            schedule: {
                date: today,
                status: 'active',
            }
        }
    }

    private shuffleArray(array: any[]): any[] {
        return array.sort(() => Math.random() - 0.5);
    }

    /**
     * Assigns activities to users based on their emotions
     * @param emotions - The list of emotions to assign activities to
     * @returns Promise containing an array of assigned activities
     */
    async assignActivities(emotions: string[]): Promise<Activity[]> {
        return Promise.all(
            emotions.map(emotion =>
                this.activityModel.find({ emotion })
            )
        ).then(results => results.flat());
    }

    /**
     * Creates a weekly schedule for activities
     * @param scheduleData - The weekly schedule data to be created
     * @returns Promise containing the created or updated WeeklySchedule
     */
    async createWeeklySchedule(scheduleData: WeeklySchedule): Promise<WeeklySchedule> {
        const existingSchedule = await this.weeklyScheduleModel.findOne({
            weekNumber: scheduleData.weekNumber,
            year: scheduleData.year
        }).exec();

        if (existingSchedule) {
            return this.weeklyScheduleModel.findByIdAndUpdate(
                existingSchedule._id,
                { $set: scheduleData },
                { new: true }
            ).exec();
        }

        const newSchedule = new this.weeklyScheduleModel(scheduleData);
        return newSchedule.save();
    }

    /**
     * Gets the current week number of the year
     * @returns The current week number
     */
    getCurrentWeek(): number {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = now.getTime() - start.getTime();
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        return Math.ceil(diff / oneWeek);
    }

    /**
     * Gets the list of active users
     * @returns Promise containing an array of active user IDs
     */
    async getActiveUsers(): Promise<string[]> {
        // This should be implemented in your UserService
        // For now, returning an empty array
        return ['67c21ed4f905699888106f03'];
    }

    /**
     * Calculates the date for a specific day in the next week
     * @param day - The day number to calculate
     * @returns Date object for the specified day in the next week
     */
    getNextWeekDate(day: number): Date {
        const now = new Date();
        const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7 * day);
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek;
    }

    /**
     * Processes a user's response to an activity
     * @param userId - The ID of the user submitting the response
     * @param activityId - The ID of the activity being responded to
     * @param responseDto - The response data containing answers
     * @returns Promise containing the processed response results and score
     * @throws NotFoundException if the activity is not found
     */
    async processResponse(userId: string, activityId: string, responseDto: ActivityResponseDto): Promise<any> {
        this.logger.log(`Processing response for user ${userId} and activity ${activityId}`);

        const activity = await this.findById(activityId);
        if (!activity) {
            throw new NotFoundException('Activity not found');
        }

        const results = responseDto.answers.map(answer => {
            const question = activity.questions.find((q: any) => q?.id.toString() == answer.questionId.toString());
            return {
                ...answer,
                isCorrect: question?.correctAnswer === answer.answer,
                points: question?.points || 0
            };
        });

        const totalScore = results.reduce((sum, result) =>
            sum + (result.isCorrect ? result.points : 0), 0);

        const responseData = {
            user: new Types.ObjectId(userId),
            activity: new Types.ObjectId(activityId),
            responses: responseDto.answers.map(answer => ({
                questionId: answer.questionId,
                answer: answer.answer,
                isCorrect: true, //results.find(r => r?.questionId === answer?.questionId)?.isCorrect || false,
                responseTime: 10
            })),
            score: totalScore,
            startTime: new Date(),
            endTime: new Date(),
            timeSpent: 10
        };

        const userResponse = await this.userResponseModel.findOne({
            activity: new Types.ObjectId(activityId),
            user: new Types.ObjectId(userId)
        }).exec();

        if (userResponse) {
            await this.userResponseModel.findByIdAndUpdate(userResponse._id, {
                ...responseData,
                responses: [...userResponse.responses, ...responseData.responses]
            }).exec();
            return {
                activityId,
                userId,
                results,
                totalScore
            };
        }

        await this.userResponseModel.create(responseData);
        return {
            activityId,
            userId,
            results,
            totalScore
        };
    }
}