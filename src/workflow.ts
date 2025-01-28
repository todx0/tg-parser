import type { Api } from 'telegram';
import type { TrendArray, CommandHandlers, DatabaseObject, ParsedCommand, DailyWords, GroupName } from 'src/types';
import { filteredSet } from 'src/utils/filters';
import {
	getMessageTextFromEvent,
	getChatId,
	parseMessageToWordsArray,
	generateHtmlFromWords,
	generateTrendsImage,
	getMapFromWords,
	generateChartImage,
	filterTrends,
	convertMessagesToDailyWords,
	getTimestampMinusNDays,
} from 'src/utils/utils';
import { trendManager, telegramParser, databaseService } from 'src/config';
import { unlink } from 'node:fs/promises';

const commandHandlers: CommandHandlers = {
	map: async (_: string[], chatId: string) => {
		const groupMap = await telegramParser.getUserChats();
		await telegramParser.sendMessage(chatId, { message: JSON.stringify(groupMap) });
		return null;
	},

	scan_limit: async (params: string[], chatId: string) => {
		const [parsedChatId, limit] = params;
		if (!parsedChatId || !limit) throw Error('Please provide valid chat id and message limit.');

		const groupName = await telegramParser.getGroupName(parsedChatId);
		const messages = await telegramParser.getMessages(parsedChatId, { limit: Number(limit) });
		const nonEmptyFilteredMessages = messages.flatMap((message) => parseMessageToWordsArray(message.message, filteredSet) as string[]);
		const trends = getMapFromWords(nonEmptyFilteredMessages);

		if (!trends || !groupName) return null;

		const filteredTrends = filterTrends(trends);
		const trendsArr: TrendArray[] = Array.from(filteredTrends).slice(0, 10);

		/**
		 * @TODO - make it separate function.
		 * and probably dont use it in scan:
		 * it should be ran automatically and write to db only then.
		 * scan should be performed in memory and just spit output.
		 */
		const today = new Date().toISOString().split('T')[0];
		for (const trend of trendsArr) {
			const [word, count] = trend;
			const dbObject: DatabaseObject = {
				groupId: parsedChatId,
				groupName: groupName,
				timestamp: today,
				word: word,
				count: count,
			};
			databaseService.add(dbObject);
		}

		const htmlTable = generateHtmlFromWords(trendsArr, groupName);

		const filepath = await generateTrendsImage(htmlTable);
		await telegramParser.sendFile(chatId, { file: filepath });
		await unlink(filepath);

		return null;
	},

	scan_days: async (params: string[], _: string) => {
		const [parsedChatId, days] = params;

		if (!parsedChatId || !days) throw Error('Please provide valid chat id and specify amount of days.');

		const groupName = await telegramParser.getGroupName(parsedChatId);

		if (!groupName) throw Error('Group name not found.');

		const offset = getTimestampMinusNDays(days);

		const messages = await telegramParser.getMessages(parsedChatId, {
			offsetDate: offset,
			reverse: true,
			limit: undefined,
			waitTime: 5,
		});

		const dailyWords = convertMessagesToDailyWords(messages);
		databaseService.addDailyWordsToDB(parsedChatId, groupName, dailyWords);

		return null;
	},

	/**
	 * @TODO - rename and edit html
	 */
	graph: async (params: string[], chatId: string) => {
		const [parsedChatId] = params;
		const wordTrendsFromDatabase = databaseService.getWordTrendsByGroupId(parsedChatId);
		const filepath = await generateChartImage(wordTrendsFromDatabase);
		await telegramParser.sendFile(chatId, { file: filepath });
		await unlink(filepath);

		return null;
	},

	words: async (_: string[], chatId: string) => {
		const trendingWords = await trendManager.getTrendingWords(chatId);
		console.log({ chatId, trendingWords });
		return null;
	},

	trends: async (_: string[], chatId: string) => {
		const trends = await trendManager.getTrends(chatId);
		console.log({ chatId, trends });
		return null;
	},
};

export async function handleCommand(message: string, chatId: string): Promise<void> {
	const parsed = parseCommand(message);
	if (!parsed) return;

	const handler = commandHandlers[parsed.command];
	if (handler) {
		await handler(parsed.params, chatId);
	}
	return;
}

export function parseCommand(message: string): ParsedCommand | null {
	if (!message.startsWith('/')) return null;
	const [command, ...params] = message.trim().slice(1).split(' ');
	return { command, params };
}

export async function botWorkflow(event: Api.TypeUpdate): Promise<void> {
	const message = getMessageTextFromEvent(event);
	const chatId = getChatId(event);
	if (!message || !chatId) return;

	await handleCommand(message, chatId);

	const words = parseMessageToWordsArray(message, filteredSet);
	if (!words) return;
	await trendManager.updateTrends(chatId, words);

	/**
	 * @TODO Parse comments from news groups (microblog)
	 */
}
