import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Activity, ActivitySchema } from '../schemas/activity.schema';
import { seedActivities } from './initial-activities.seed';

@Module({
    imports: [
        ConfigModule.forRoot(),
        MongooseModule.forRoot(process.env.MONGO_URI),
        MongooseModule.forFeature([
            { name: Activity.name, schema: ActivitySchema }
        ])
    ]
})
class SeedModule { }

async function bootstrap() {
    const app = await NestFactory.create(SeedModule);
    const activityModel = app.get(getModelToken(Activity.name));

    try {
        await seedActivities(activityModel);
    } catch (error) {
    } finally {
        await app.close();
    }
}

bootstrap();