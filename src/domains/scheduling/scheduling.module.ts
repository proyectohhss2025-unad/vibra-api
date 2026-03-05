import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WeeklyScheduler } from './weekly-scheduler.service';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        ActivitiesModule
    ],
    providers: [WeeklyScheduler],
    exports: [WeeklyScheduler]
})
export class SchedulingModule { }