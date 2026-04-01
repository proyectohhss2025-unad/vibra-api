import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ActivitiesService } from 'src/domains/activities/activities.service';
import { Activity } from 'src/domains/activities/schemas/activity.schema';
import { Emotion } from 'src/domains/emotions/schemas/emotion.schema';

@Injectable()
export class WeeklyScheduler {
  private readonly logger = new Logger(WeeklyScheduler.name);

  constructor(private activityService: ActivitiesService) {}

  //@Cron('0 20 * * 0') // Domingo 20:00 GMT
  @Cron('48 22 * * *') // Every day at 22:00 (10:00 PM)
  async generateWeeklyPlan() {
    this.logger.log('Starting weekly plan generation...');
    try {
      const emotions = await this.activityService.getRandomEmotions(7);
      console.log('emotions:', emotions);

      const activities: Activity[] =
        await this.activityService.assignActivities(emotions);
      console.log('activities:', activities);

      const weekSchedule = activities.map((activity: Activity, index) => ({
        date: this.getNextWeekDate(index),
        emotion: activity.emotion._id.toString(),
        activity: activity._id.toString(),
        status: 'pending',
      }));

      console.log('Weekly schedule:', weekSchedule);

      await this.activityService.createWeeklySchedule({
        weekNumber: this.activityService.getCurrentWeek(),
        year: new Date().getFullYear(),
        days: weekSchedule as {
          date: Date;
          emotion: string;
          activity: string;
          status: 'pending' | 'completed' | 'skipped';
        }[],
        participants: await this.activityService.getActiveUsers(),
      } as unknown as any);

      this.sendNotifications();
      this.logger.log('Weekly plan generated successfully');
    } catch (error) {
      this.logger.error('Error generating weekly plan:', error);
      throw error;
    }
  }

  private sendNotifications() {
    // TODO: Implement notification sending logic
    console.log('Notifications sent');
  }

  private getNextWeekDate(dayIndex: number): Date {
    const currentDate = new Date();
    const daysToAdd = dayIndex - currentDate.getDay();
    const nextWeekDate = new Date(currentDate);
    nextWeekDate.setDate(currentDate.getDate() + daysToAdd);
    return nextWeekDate;
  }
}
