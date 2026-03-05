import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSession, UserSessionSchema } from './schemas/userSession.schema';
import { UserSessionsService } from './userSessions.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: UserSession.name, schema: UserSessionSchema },
        ]),
    ],
    providers: [UserSessionsService],
    exports: [MongooseModule, UserSessionsService],
})
export class UserSessionsModule { }