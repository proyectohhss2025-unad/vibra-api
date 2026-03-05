import { PartialType } from '@nestjs/mapped-types';
import { CreatePreTestDto } from './create-pretest.dto';

export class UpdatePreTestDto extends PartialType(CreatePreTestDto) { }
