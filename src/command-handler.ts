import type { TrendArray, GroupId, ITelegramParser, ICommandHandler, IDatabaseService, CommandMapping } from 'src/types';
import { filteredSet } from 'src/utils/filters';
import {
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
import { unlink } from 'node:fs/promises';

export class CommandHandler implements ICommandHandler {
	constructor(
		private telegramParser: ITelegramParser,
		private databaseService: IDatabaseService,
	) {}

	public async handleCommand(message: string, chatId: GroupId): Promise<void> {
		const parsed = this.parseCommand(message);
		if (!parsed) return;

		const commandMapping: CommandMapping = {
			map: () => this.map(parsed.params, chatId),
			scan_days: () => this.scanDays(parsed.params, chatId),
			scan_limit: () => this.scanLimit(parsed.params, chatId),
			graph: () => this.graph(parsed.params, chatId),
		};

		const command = commandMapping[parsed.command];

		if (command) await command();

		return;
	}

	private async map(_: string[], chatId: GroupId) {
		const groupMap = await this.telegramParser.getUserChats();
		await this.telegramParser.sendMessage(chatId, { message: JSON.stringify(groupMap) });
	}

	private async scanLimit(params: string[], chatId: GroupId) {
		const [parsedChatId, limit] = params;
		if (!parsedChatId || !limit) throw Error('Please provide valid chat id and message limit.');

		const groupName = await this.telegramParser.getGroupName(parsedChatId);
		const messages = await this.telegramParser.getMessages(parsedChatId, { limit: Number(limit) });
		const nonEmptyFilteredMessages = messages.flatMap((message) => parseMessageToWordsArray(message.message, filteredSet) as string[]);
		const trends = getMapFromWords(nonEmptyFilteredMessages);

		if (!trends || !groupName) return;

		const filteredTrends = filterTrends(trends);
		const trendsArr: TrendArray[] = Array.from(filteredTrends).slice(0, 10);

		const htmlTable = await generateWordsHtml(trendsArr, groupName);

		const filepath = await generateWordsImage(htmlTable);
		await this.telegramParser.sendFile(chatId, { file: filepath });

		await unlink(filepath);
	}

	private async scanDays(params: string[], chatId: GroupId) {
		const [parsedChatId, days] = params;

		if (!parsedChatId || !days) throw Error('Please provide valid chat id and specify amount of days.');

		const groupName = await this.telegramParser.getGroupName(parsedChatId);
		if (!groupName) return;

		const offset = getTimestampMinusNDays(days);

		const messages = await this.telegramParser.getMessages(parsedChatId, {
			offsetDate: offset,
			reverse: true,
			limit: undefined,
			waitTime: 5,
		});

		const dailyWords = convertMessagesToDailyWords(messages);
		this.databaseService.addDailyWordsToDB(parsedChatId, groupName, dailyWords);

		await this.telegramParser.sendMessage(chatId, { message: 'Finished. Run /graph {groupId} to see results.' });

		return;
	}

	private async graph(params: string[], chatId: GroupId) {
		const [parsedChatId] = params;
		const wordTrendsFromDatabase = this.databaseService.getWordTrendsByGroupId(parsedChatId);
		const groupName = await this.telegramParser.getGroupName(parsedChatId);
		if (!groupName) return;

		const chartHtml = await generateChartHtml(wordTrendsFromDatabase, groupName);
		const filepath = await generateChartImage(chartHtml);
		await this.telegramParser.sendFile(chatId, { file: filepath });
		await unlink(filepath);

		return;
	}

	private parseCommand(message: string) {
		if (!message.startsWith('/')) return null;
		const [command, ...params] = message.trim().slice(1).split(' ');
		return { command, params };
	}
}
