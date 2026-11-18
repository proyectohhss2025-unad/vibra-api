import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityModule } from '../security/security.module';
import { CaptchaController } from './captcha.controller';
import { CaptchaService } from './captcha.service';
import {
  CaptchaChallenge,
  CaptchaChallengeSchema,
} from './schemas/captcha-challenge.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CaptchaChallenge.name, schema: CaptchaChallengeSchema },
    ]),
    SecurityModule,
  ],
  controllers: [CaptchaController],
  providers: [CaptchaService],
  exports: [CaptchaService],
})
export class CaptchaModule {}
