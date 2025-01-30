import type { Api } from 'telegram';
import type { TrendArray, CommandHandlers, ParsedCommand } from 'src/types';
import { filteredSet } from 'src/utils/filters';
import {
	getMessageTextFromEvent,
	getChatId,
	parseMessageToWordsArray,
	generateWordsImage,
	generateWordsHtml,
	getMapFromWords,
	generateChartImage,
	filterTrends,
	convertMessagesToDailyWords,
	getTimestampMinusNDays,
	generateChartHtml,
} from 'src/utils/utils';
import { telegramParser, databaseService } from 'src/config';
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

		const htmlTable = await generateWordsHtml(trendsArr, groupName);

		const filepath = await generateWordsImage(htmlTable);
		await telegramParser.sendFile(chatId, { file: filepath });
		await unlink(filepath);

		return null;
	},

	scan_days: async (params: string[], chatId: string) => {
		const [parsedChatId, days] = params;

		if (!parsedChatId || !days) throw Error('Please provide valid chat id and specify amount of days.');

		const groupName = await telegramParser.getGroupName(parsedChatId);
		if (!groupName) return null;

		const offset = getTimestampMinusNDays(days);

		const messages = await telegramParser.getMessages(parsedChatId, {
			offsetDate: offset,
			reverse: true,
			limit: undefined,
			waitTime: 5,
		});

		const dailyWords = convertMessagesToDailyWords(messages);
		databaseService.addDailyWordsToDB(parsedChatId, groupName, dailyWords);

		await telegramParser.sendMessage(chatId, { message: 'Finished. Run /graph {groupId} to see results.' });

		return null;
	},

	graph: async (params: string[], chatId: string) => {
		const [parsedChatId] = params;
		const wordTrendsFromDatabase = databaseService.getWordTrendsByGroupId(parsedChatId);
		const groupName = await telegramParser.getGroupName(parsedChatId);
		if (!groupName) return null;

		const chartHtml = await generateChartHtml(wordTrendsFromDatabase, groupName);
		const filepath = await generateChartImage(chartHtml);
		await telegramParser.sendFile(chatId, { file: filepath });
		await unlink(filepath);

		return null;
	},
};

export async function handleCommand(message: string, chatId: string): Promise<boolean> {
	const parsed = parseCommand(message);
	if (!parsed) return false;

	const handler = commandHandlers[parsed.command];
	if (handler) {
		await handler(parsed.params, chatId);
		return true;
	}
	return false;
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

	const commandResult = await handleCommand(message, chatId);
	if (commandResult) return;

	const words = parseMessageToWordsArray(message, filteredSet);
	if (!words) return;

	/**
	 * @TODO Parse comments from news groups (microblog)
	 */
}
