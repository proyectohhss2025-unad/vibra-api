import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { Emotion } from './schemas/emotion.schema';

@Injectable()
export class EmotionsService {
    constructor(
        @InjectModel(Emotion.name) private emotionModel: Model<Emotion>,
        private readonly logger: AppLoggerService,
    ) {
        this.logger.log('EmotionsService initialized');
    }

    async create(createEmotionDto: any): Promise<Emotion> {
        this.logger.log(`Creating a new emotion...: ${createEmotionDto}`);
        const createdEmotion = new this.emotionModel({ ...createEmotionDto });
        return createdEmotion.save();
    }

    async findAll(page: number = 1, limit: number = 10): Promise<{ data: Emotion[]; total: number; }> {
        this.logger.log('Fetching paginated emotions...');
        const skip = (page - 1) * limit;
        const data = await this.emotionModel.find().skip(skip).limit(limit).exec();
        const total = await this.emotionModel.countDocuments().exec();
        return { data, total };
    }

    async findByName(name: string): Promise<Emotion | undefined> {
        this.logger.log(`Finding emotion by name: ${name}`);
        return this.emotionModel.findOne({ name }).exec();
    }
}
