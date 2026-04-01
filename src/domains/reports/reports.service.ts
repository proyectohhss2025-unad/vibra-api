import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from './schemas/report.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
  ) {}

  create(createReportDto: CreateReportDto) {
    const newReport = new this.reportModel(createReportDto);
    return newReport.save();
  }

  findAll() {
    return this.reportModel.find({ deleted: false }).exec();
  }

  findOne(id: string) {
    return this.reportModel.findById(id).exec();
  }

  async update(id: string, updateReportDto: UpdateReportDto) {
    const existingReport = await this.reportModel
      .findByIdAndUpdate(id, { $set: updateReportDto }, { new: true })
      .exec();

    if (!existingReport) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return existingReport;
  }

  async remove(id: string) {
    const report = await this.reportModel.findById(id).exec();

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    report.deleted = true;
    report.deletedAt = new Date();
    return report.save();
  }
}
