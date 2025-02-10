import { StringSession } from 'telegram/sessions/index';
import { TG } from '@src/tg/telegram-parser';
import { DatabaseService } from 'src/db/database-service';
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
export const tgClient = new TG(new StringSession(config.SESSION), +config.API_ID, config.API_HASH, {
	connectionRetries: 5,
});

// Database (Sqlite)
const db = new Database(config.DB_NAME, { create: true });
export const databaseService = new DatabaseService(db);

// Commands
export const createCommandHandler = async () => {
	// why top level await is not working?
	const { CommandHandler } = await import('@src/commands/command-handler');
	return new CommandHandler(tgClient, databaseService);
};
