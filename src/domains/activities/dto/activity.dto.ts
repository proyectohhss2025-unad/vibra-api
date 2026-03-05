import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ResourceDto {
    @IsEnum(['video', 'audio'])
    type: 'video' | 'audio';

    @IsNotEmpty()
    @IsString()
    url: string;

    @IsOptional()
    @IsNumber()
    duration?: number;

    @IsOptional()
    metadata?: Record<string, any>;
}

class QuestionDto {
    @IsNotEmpty()
    @IsString()
    questionText: string;

    @IsEnum(['multiple', 'open'])
    type: 'multiple' | 'open';

    @IsOptional()
    @IsString({ each: true })
    options?: string[];

    @IsOptional()
    @IsString()
    correctAnswer?: string;

    @IsNumber()
    points: number;
}

export class CreateActivityDto {
    @IsNotEmpty()
    @IsString()
    emotion: string;

    @IsNotEmpty()
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @ValidateNested({ each: true })
    @Type(() => ResourceDto)
    resources: ResourceDto[];

    @ValidateNested({ each: true })
    @Type(() => QuestionDto)
    questions: QuestionDto[];

    @IsOptional()
    @IsNumber()
    difficulty?: number;
}

export class UpdateActivityDto extends CreateActivityDto {
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}