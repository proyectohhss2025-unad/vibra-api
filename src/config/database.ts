import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { envVars } from './index';

dotenv.config();

export const env = envVars.parse(process.env);

const DB_PORT = env.DB_PORT;
const DB_HOSTNAME = env.DB_HOST;
const DB_NAME = env.DB_NAME;

mongoose.connect(`mongodb://${DB_HOSTNAME}:${DB_PORT}/${DB_NAME}`, {});
