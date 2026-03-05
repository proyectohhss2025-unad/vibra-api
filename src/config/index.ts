//INFO: ENVIRONMENTAL VARIABLES FOR THE APPLICATION 

import { z } from "zod";

export const envVars = z.object({
  MONGO_URI: z.string(),
  HOST: z.string(),
  PORT: z.string(),
  SECRET: z.string(),
  DB_NAME: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.string(),
  JWT_SECRET: z.string(),
  EMAIL_SEND: z.string(),
  EMAIL_SECRET_SEND: z.string(),
  CLIENT_ID: z.string(),
  TENANT_ID: z.string(),
  CLIENT_SECRET: z.string(),
  NODE_ENV: z.string(),
  CLIENT_SOCKET: z.string().url(),
  TWILIO_SENDGRID_API_KEY: z.string(),
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_PHONE_NUMBER: z.string(),
  TWILIO_PHONE_NUMBER_WHATSAPP: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),
  MEDIA_STORAGE: z.string(),
  CORS_ORIGINS: z.string(),
});

envVars.parse(process.env);
