import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @RequirePermission('P-DOC-005')
  @Get('kpi')
  getKpi(@Query() filter: ReportFilterDto) {
    return this.reportsService.getKpi(filter);
  }

  @RequirePermission('P-DOC-005')
  @Get('by-activity')
  getByActivity(@Query() filter: ReportFilterDto) {
    return this.reportsService.getByActivity(filter);
  }

  @RequirePermission('P-DOC-005')
  @Get('by-user')
  getByUser(@Query() filter: ReportFilterDto) {
    return this.reportsService.getByUser(filter);
  }

  @RequirePermission('P-DOC-005')
  @Get('by-emotion')
  getByEmotion(@Query() filter: ReportFilterDto) {
    return this.reportsService.getByEmotion(filter);
  }

  @RequirePermission('P-DOC-005')
  @Get('trend')
  getTrend(@Query() filter: ReportFilterDto) {
    return this.reportsService.getTrend(filter);
  }

  @RequirePermission('P-DOC-005')
  @Get('scores')
  getScores(@Query() filter: ReportFilterDto) {
    return this.reportsService.getScores(filter);
  }

  @RequirePermission('P-DOC-002')
  @Get('user-profile/:userId')
  getUserProfile(@Param('userId') userId: string) {
    return this.reportsService.getUserProfile(userId);
  }
}
