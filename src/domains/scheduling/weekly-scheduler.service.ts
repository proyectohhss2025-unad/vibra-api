import { Injectable, Logger } from '@nestjs/common';
import { ActivitiesService } from 'src/domains/activities/activities.service';
import { Activity } from 'src/domains/activities/schemas/activity.schema';

/**
 * Programador semanal de actividades.
 *
 * NOTA: Estos jobs ahora se gestionan desde el panel de administración
 * de Tareas Programadas (CronJobModule). Los @Cron estáticos se
 * han eliminado en favor del sistema dinámico de jobs.
 *
 * Los métodos se mantienen por compatibilidad y pueden ser
 * invocados desde JobTypeRegistry.
 */
@Injectable()
export class WeeklyScheduler {
  private readonly logger = new Logger(WeeklyScheduler.name);

  constructor(private activityService: ActivitiesService) {}

  /**
   * Desactiva actividades cuya fecha de programación ya pasó.
   */
  async deactivateExpiredActivities() {
    this.logger.log('Checking for expired activities...');
    try {
      const count =
        await this.activityService.deactivateExpiredActivities();
      this.logger.log(
        `[ExpiredActivities] Job completed. ${count} actividades desactivadas.`,
      );
      return { success: true, count };
    } catch (error) {
      this.logger.error('Error deactivating expired activities:', error);
      throw error;
    }
  }

  /**
   * Genera el plan semanal de actividades.
   */
  async generateWeeklyPlan() {
    this.logger.log('Starting weekly plan generation...');
    try {
      const emotions = await this.activityService.getRandomEmotions(7);
      const activities: Activity[] =
        await this.activityService.assignActivities(emotions);

      const weekSchedule = activities.map((activity: Activity, index) => ({
        date: this.getNextWeekDate(index),
        emotion: activity.emotion._id.toString(),
        activity: activity._id.toString(),
        status: 'pending',
      }));

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

      this.logger.log('Weekly plan generated successfully');
      return { success: true, daysCount: weekSchedule.length };
    } catch (error) {
      this.logger.error('Error generating weekly plan:', error);
      throw error;
    }
  }

  private getNextWeekDate(dayIndex: number): Date {
    const currentDate = new Date();
    const daysToAdd = dayIndex - currentDate.getDay();
    const nextWeekDate = new Date(currentDate);
    nextWeekDate.setDate(currentDate.getDate() + daysToAdd);
    return nextWeekDate;
  }
}
