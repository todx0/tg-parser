import { StringSession } from 'telegram/sessions/index';
import { TelegramParser } from 'src/telegram-parser';
import { DatabaseService } from 'src/db/database-service';
import { CommandHandler } from 'src/command-handler';
import { Database } from 'bun:sqlite';
import { getEnvVariable } from 'src/utils/utils';
import type { AppConfig } from 'src/types';

export const config: AppConfig = {
	API_ID: getEnvVariable('API_ID'),
	SESSION: getEnvVariable('SESSION'),
	API_HASH: getEnvVariable('API_HASH'),
	DB_NAME: getEnvVariable('DB_NAME'),
};

// Filters
export const filterFilePath = './filter.txt';

// Telegram
export const telegramParser = new TelegramParser(new StringSession(config.SESSION), +config.API_ID, config.API_HASH, {
	connectionRetries: 5,
});

// Database (Sqlite)
const db = new Database(config.DB_NAME, { create: true });
export const databaseService = new DatabaseService(db);

// Commands
export const commandHandler = new CommandHandler(telegramParser, databaseService);
