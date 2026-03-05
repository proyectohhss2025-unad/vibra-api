import { IsArray, IsString, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
    @IsString()
    questionId: string;

    @IsString()
    answer: string;

    @IsNumber()
    @IsOptional()
    responseTime?: number;
}

export class ActivityResponseDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AnswerDto)
    answers: AnswerDto[];
}