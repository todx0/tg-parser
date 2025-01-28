import type { Api } from 'telegram';
import type { TrendArray, CommandHandlers, DatabaseObject, ParsedCommand } from 'src/types';
import { filteredSet } from 'src/utils/filters';
import {
	getMessageTextFromEvent,
	getChatId,
	parseMessageToWordsArray,
	generateHtmlFromWords,
	generateTrendsImage,
	getMapFromWords,
	generateChartImage,
	formatTimestamp,
	filterTrends,
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

	scan_days: async (params: string[], chatId: string) => {
		const [parsedChatId, days] = params;

		if (!parsedChatId || !days) throw Error('Please provide valid chat id and specify amount of days.');

		const groupName = await telegramParser.getGroupName(parsedChatId);

		if (!groupName) throw Error('Group name not found.');

		const offset = Math.floor(Date.now() / 1000) - Number.parseInt(days) * 24 * 60 * 60;
		const messages = await telegramParser.getMessages(parsedChatId, {
			offsetDate: offset,
			reverse: true,
			limit: undefined,
			waitTime: 5,
		});

		const dailyWords = messages
			.map((message) => ({ date: formatTimestamp(message.date), words: parseMessageToWordsArray(message.message, filteredSet) }))
			.filter((message) => message.words.length > 1)
			.reduce(
				(acc, item) => {
					if (acc[item.date]) {
						acc[item.date].words.push(...item.words);
					} else {
						acc[item.date] = { date: item.date, words: [...item.words] };
					}
					return acc;
				},
				{} as Record<string, { date: string; words: string[] }>,
			);

		const dailyWordsArr = Object.values(dailyWords);

		const dailyWordsMapped = dailyWordsArr.map((o) => ({ date: o.date, words: Array.from(filterTrends(getMapFromWords(o.words))) }));

		for (const object of dailyWordsMapped) {
			for (const trend of object.words) {
				const [word, count] = trend;
				const dbObject: DatabaseObject = {
					groupId: parsedChatId,
					groupName: groupName,
					timestamp: object.date,
					word: word,
					count: count,
				};
				databaseService.add(dbObject);
			}
		}

		//const nonEmptyFilteredMessages = messages.flatMap((message) => parseMessageToWordsArray(message.message, filteredSet) as string[]);
		//const trends = getMapFromWords(nonEmptyFilteredMessages);

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
	 * @TODO Work from any chat by parsing arguments
	 * Parse command: get parsedChatId argument
	 * Implement telegram.sendMessage
	 * Send trendingWords from parsedChatId to chatId
	 * Optional: send message as table
	 */

	/**
	 * @TODO Parse comments from news groups (microblog)
	 */
}
