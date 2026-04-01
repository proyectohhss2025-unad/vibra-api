import { v4 as uuid } from 'uuid';
import { sendOTPEmail } from '../helpers/email';

import * as dotenv from 'dotenv';
import { envVars } from '../config';

dotenv.config();

export const env = envVars.parse(process.env);

export const generateOTP = (email: string): string => {
  const otp = uuid().slice(0, 6); // Generate a 6-digit OTP
  sendOTPEmail(email, otp, env.NODE_ENV === 'development');
  return otp;
};
