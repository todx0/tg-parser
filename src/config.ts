import { StringSession } from 'telegram/sessions/index';
import { TrendManager } from 'src/trend-manager';
import { TelegramParser } from 'src/telegram-parser';
import { DatabaseService } from 'src/db/database-service';

export const config = {
	API_ID: Bun.env.API_ID as string,
	SESSION: Bun.env.SESSION as string,
	API_HASH: Bun.env.API_HASH as string,
	DB_NAME: Bun.env.DB_NAME as string,
	REDIS: Bun.env.REDIS as string,
};

// Telegram
export const telegramParser = new TelegramParser(new StringSession(config.SESSION), +config.API_ID, config.API_HASH, {
	connectionRetries: 5,
});

// Trend Manager (Redis)
export const trendManager = new TrendManager(config.REDIS);

// Database (Sqlite)
export const databaseService = new DatabaseService(config.DB_NAME);
