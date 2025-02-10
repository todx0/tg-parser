//@ts-nocheck

import { expect, test, mock, describe, beforeAll, afterAll } from 'bun:test';
import { CommandHandler } from '@src/commands/command-handler';
import { Database } from 'bun:sqlite';
import { DatabaseService } from 'src/db/database-service';
import { unlink } from 'node:fs/promises';
import type { ICommandHandler, IDatabaseService, ITelegramParser } from 'src/types';

describe('Command Handler Unit', async () => {
	let commandHandler: ICommandHandler;
	let telegramParser: ITelegramParser;
	let databaseService: IDatabaseService;

	const testDbName = 'testdb.sqlite';
	const testGroupId = '-100420';
	const testGroupName = 'Test Group';

	beforeAll(async () => {
		telegramParser = {
			getUserChats: mock(async () => ({ testGroupName: testGroupId })),
			sendMessage: mock(async () => {}),
			getGroupName: mock(async () => testGroupName),
			getMessages: mock(async () => [
				{ date: 1738336357, message: 'text aaaaa bbbb dfgfdg EXIST EXIST' },
				{ date: 1738336357, message: 'text2 dsfgfdsgfdsg 12341234 sdfsf EXIST EXIST' },
			]),
		};

		const db = new Database(testDbName, { create: true });
		databaseService = new DatabaseService(db);
		commandHandler = new CommandHandler(telegramParser, databaseService);
	});

	afterAll(async () => {
		await unlink(testDbName);
	});

	test('should parse and execute the /map command', async () => {
		await commandHandler.handleCommand('/map', testGroupId);
		expect(telegramParser.sendMessage).toHaveBeenCalledWith(testGroupId, {
			message: JSON.stringify({ testGroupName: testGroupId }),
		});
	});

	test('should parse and execute the /scan_days command', async () => {
		await commandHandler.handleCommand(`/scan_days ${testGroupId} 2`, testGroupId);

		const wordTrends = databaseService.getWordTrendsByGroupId(testGroupId);
		const expectedResult = {
			timestamp: '2025-01-31',
			words: {
				exist: 4,
			},
		};

		expect(telegramParser.getGroupName).toHaveBeenCalledWith(testGroupId);
		expect(telegramParser.sendMessage).toHaveBeenCalledWith(testGroupId, {
			message: 'Finished. Run /graph {groupId} to see results.',
		});
		expect(wordTrends[0]).toEqual(expectedResult);
	});
});
