import type { TelegramClient } from 'telegram';

// ======================
// Core Types
// ======================

export type Word = string;
export type Count = number;
export type Timestamp = string;
export type GroupId = string;
export type GroupName = string;

export interface WordCount {
	[word: string]: number;
}

// ======================
// Trends Module
// ======================

export type Trend = Map<Word, Count>;
export type GroupTrends = Map<GroupId, Trend>;
export type TrendArray = [Word, Count];

export interface SerializedTrends {
	[groupId: GroupId]: {
		[word: Word]: Count;
	};
}

// ======================
// Telegram Parser Module
// ======================

export interface ITelegramParser extends TelegramClient {
	getGroupName(chatId: Api.TypeEntityLike): Promise<string | null>;
	getUserChats(): Promise<GroupMap>;
}

export type GroupMap = Record<GroupName, GroupId>;

// ======================
// Workflow Module
// ======================

export interface ParsedCommand {
	command: string;
	params: string[];
}

export type CommandHandler = (params: string[], chatId: GroupId) => Promise<null>;

export interface CommandHandlers {
	[key: string]: CommandHandler;
}

// ======================
// Filters Module
// ======================

export type FilteredSet = Set<Word>;

// ======================
// Database Module
// ======================

export interface IDatabaseService {
	addDailyWordsToDB(groupId: string, groupName: GroupName, dailyWords: DailyWords): void;
	getWordTrendsByGroupId(groupId: GroupId): FormattedRow[];
}

export interface IDatabseInitializer {
	init(): Database;
}

export interface IRepository {
	insertObjectToDB(data: DatabaseObject): void;
}

export interface DatabaseObject {
	groupId: GroupId;
	groupName: GroupName;
	timestamp: Timestamp;
	word: Word;
	count: Count;
}

export type DailyWords = {
	date: string;
	words: [string, number][];
}[];

export type WordMap = Record<Word, Count>;

export type TrendRow = {
	timestamp: Timestamp;
	word: Word;
	count: Count;
};

export interface FormattedRow {
	timestamp: Timestamp;
	words: WordMap;
}

// ======================
// App / Config Module
// ======================

export interface AppConfig {
	API_ID: string;
	SESSION: string;
	API_HASH: string;
	DB_NAME: string;
	REDIS: string;
}
