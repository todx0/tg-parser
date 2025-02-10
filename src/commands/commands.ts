import type { ICommand, ITelegramParser, IDatabaseService, GroupId, TrendArray } from 'src/types';
import { createFilteredSet } from 'src/utils/filters';
import {
	getMapFromWords,
	parseMessageToWordsArray,
	filterTrends,
	generateChartImage,
	generateChartHtml,
	generateWordsHtml,
	generateWordsImage,
	getTimestampMinusNDays,
	convertMessagesToDailyWords,
} from 'src/utils/utils';
import { unlink } from 'node:fs/promises';

export class MapCommand implements ICommand {
	constructor(private telegramParser: ITelegramParser) {}

	async execute(_: string[], chatId: GroupId): Promise<void> {
		const groupMap = await this.telegramParser.getUserChats();
		await this.telegramParser.sendMessage(chatId, { message: JSON.stringify(groupMap) });
	}
}

export class ScanLimitCommand implements ICommand {
	constructor(
		private telegramParser: ITelegramParser,
		private databaseService: IDatabaseService,
	) {}

	async execute(params: string[], chatId: GroupId): Promise<void> {
		const [parsedChatId, limit] = params;
		if (!parsedChatId || !limit) throw Error('Please provide valid chat id and message limit.');

		const groupName = await this.telegramParser.getGroupName(parsedChatId);
		const messages = await this.telegramParser.getMessages(parsedChatId, { limit: Number(limit) });
		const filteredSet = await createFilteredSet();
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
}

export class ScanDaysCommand implements ICommand {
	constructor(
		private telegramParser: ITelegramParser,
		private databaseService: IDatabaseService,
	) {}

	async execute(params: string[], chatId: GroupId): Promise<void> {
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

		const dailyWords = await convertMessagesToDailyWords(messages);
		this.databaseService.addDailyWordsToDB(parsedChatId, groupName, dailyWords);

		await this.telegramParser.sendMessage(chatId, { message: 'Finished. Run /graph {groupId} to see results.' });
	}
}

export class GraphCommand implements ICommand {
	constructor(
		private telegramParser: ITelegramParser,
		private databaseService: IDatabaseService,
	) {}

	async execute(params: string[], chatId: GroupId): Promise<void> {
		const [parsedChatId] = params;
		const wordTrendsFromDatabase = this.databaseService.getWordTrendsByGroupId(parsedChatId);
		const groupName = await this.telegramParser.getGroupName(parsedChatId);
		if (!groupName) return;

		const chartHtml = await generateChartHtml(wordTrendsFromDatabase, groupName);
		const filepath = await generateChartImage(chartHtml);
		await this.telegramParser.sendFile(chatId, { file: filepath });
		await unlink(filepath);
	}
}

export class GetEntityCommand implements ICommand {
	constructor(private telegramParser: ITelegramParser) {}

	async execute(params: string[], chatId: GroupId): Promise<void> {
		const [parsedChatId] = params;

		const entity = await this.telegramParser.getEntity(parsedChatId);

		await this.telegramParser.sendMessage(chatId, { message: JSON.stringify(entity) });
	}
}

export class GetTopicsCommand implements ICommand {
	constructor(private telegramParser: ITelegramParser) {}

	async execute(params: string[], chatId: GroupId): Promise<void> {
		const [parsedChatId] = params;

		const topics = await this.telegramParser.getTopics(parsedChatId);

		await this.telegramParser.sendMessage(chatId, { message: JSON.stringify(topics) });
	}
}

export class GetTopicReplies implements ICommand {
	constructor(private telegramParser: ITelegramParser) {}

	async execute(params: string[], chatId: GroupId): Promise<void> {
		const [parsedChatId, topicId, limit] = params;

		const filepath = await this.telegramParser.getMessagesFromTopic(Number(parsedChatId), Number(topicId), Number(limit));
		const file = Bun.file(filepath);
		if (!file) throw Error(`No file found on filepath ${filepath}`);

		await this.telegramParser.sendFile(chatId, { file: filepath });
	}
}
