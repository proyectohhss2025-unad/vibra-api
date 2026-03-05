export class CreateReportDto {
    reportName: string;
    reportType: 'PDF' | 'Excel';
    createdBy: string;
}