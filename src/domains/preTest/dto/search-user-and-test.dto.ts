import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchUserAndTestDto {
  @ApiProperty({
    description:
      'Identificador del usuario (en Vibra se suele usar el documentNumber).',
    example: '6803296',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Identificador del pre-test.',
    example: 'PRETEST-BASELINE-EMOTIONS',
  })
  @IsString()
  @IsNotEmpty()
  testId: string;
}

