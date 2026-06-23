import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from '../company/schemas/company.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  Participant,
  ParticipantSchema,
} from '../participant/schemas/participant.schema';
import {
  UserResponse,
  UserResponseSchema,
} from '../userResponses/schemas/userResponse.schema';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { Course, CourseSchema } from './schemas/course.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: UserResponse.name, schema: UserResponseSchema },
    ]),
  ],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
