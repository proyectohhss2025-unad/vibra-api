//#region CONEXIONES A BD LOCAL

import * as dotenv from 'dotenv';
import { envVars } from './index';

dotenv.config();

export const env = envVars.parse(process.env);

const DB_PORT = env.DB_PORT;
const DB_HOSTNAME = env.DB_HOST;
const DB_NAME = env.DB_NAME;

const uri = `mongodb://${DB_HOSTNAME}:${DB_PORT}/${DB_NAME}`;

//#endregion

module.exports = {
  mongoURI: uri,
};
