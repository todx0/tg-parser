import { StringSession } from 'telegram/sessions/index';
import { TrendManager } from 'src/trend-manager';
import { TelegramParser } from 'src/telegram-parser';
import { DatabaseService } from 'src/db/database-service';
import { Database } from 'bun:sqlite';
import { getEnvVariable } from 'src/utils/utils';
import type { AppConfig } from 'src/types';

export const config: AppConfig = {
	API_ID: getEnvVariable('API_ID'),
	SESSION: getEnvVariable('SESSION'),
	API_HASH: getEnvVariable('API_HASH'),
	DB_NAME: getEnvVariable('DB_NAME'),
	REDIS: getEnvVariable('REDIS'),
};

// Telegram
export const telegramParser = new TelegramParser(new StringSession(config.SESSION), +config.API_ID, config.API_HASH, {
	connectionRetries: 5,
});

// Trend Manager (Redis)
export const trendManager = new TrendManager(config.REDIS);

// Database (Sqlite)
const db = new Database(config.DB_NAME, { create: true });
export const databaseService = new DatabaseService(db);
