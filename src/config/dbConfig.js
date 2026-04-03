import mongoose from 'mongoose';

import { DEV_DB_URL, NODE_ENV, PROD_DB_URL } from './serverConfig.js';

export default async function connectDB() {
  try {
    const databaseUrl = NODE_ENV === 'production' ? PROD_DB_URL : DEV_DB_URL;

    if (!databaseUrl) {
      throw new Error(`Database URL is not configured for ${NODE_ENV} environment`);
    }

    await mongoose.connect(databaseUrl);
    console.log(`Connected to mongodb database from ${NODE_ENV} environment`);
  } catch (error) {
    console.error('Error connecting to database', error);
    throw error;
  }
}
