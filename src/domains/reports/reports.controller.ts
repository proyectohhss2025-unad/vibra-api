import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('kpi')
  getKpi(@Query() filter: ReportFilterDto) {
    return this.reportsService.getKpi(filter);
  }

  @Get('by-activity')
  getByActivity(@Query() filter: ReportFilterDto) {
    return this.reportsService.getByActivity(filter);
  }

  @Get('by-user')
  getByUser(@Query() filter: ReportFilterDto) {
    return this.reportsService.getByUser(filter);
  }

  @Get('by-emotion')
  getByEmotion(@Query() filter: ReportFilterDto) {
    return this.reportsService.getByEmotion(filter);
  }

  @Get('trend')
  getTrend(@Query() filter: ReportFilterDto) {
    return this.reportsService.getTrend(filter);
  }

  @Get('scores')
  getScores(@Query() filter: ReportFilterDto) {
    return this.reportsService.getScores(filter);
  }

  @Get('user-profile/:userId')
  getUserProfile(@Param('userId') userId: string) {
    return this.reportsService.getUserProfile(userId);
  }
}
