import type { TelegramClient } from 'telegram';
// ======================
// Core Types
// ======================

export type Word = string;
export type Count = number;

/** Represents a word and its occurrence count */
//type WordCount = [word: string, count: count];
export interface WordCount {
	[word: string]: number;
}

/** Represents a timestamp in string format */
export type Timestamp = string;

/** Represents a group ID (unique identifier for a group) */
export type GroupId = string;

/** Represents a group name (human-readable name for a group) */
export type GroupName = string;

// ======================
// Trends Module
// ======================

export interface ITrendManager {
	updateTrends(groupId: GroupId, words: Word[]): Promise<void>;
	getTrends(groupId: GroupId): Promise<Trend | null>;
	getTrendingWords(groupId: GroupId): Promise<string[] | null>;
	applyDecay(): Promise<void>;
	filterTrends(trends: Trend): Trend;
	startDecayScheduler(): NodeJS.Timer;
	close(): Promise<void>;
}

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

//type TrendRow = Record<Timestamp, WordMap>;
export type TrendRow = {
	timestamp: Timestamp;
	word: Word;
	count: Count;
};

//type FormattedRow = Record<Timestamp, WordMap>;
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
