import { IsString, IsBoolean } from 'class-validator';

export class CreateCronJobDto {
    @IsString()
    expression: string;

    @IsString()
    jobType: string;

    @IsBoolean()
    active: boolean;
}