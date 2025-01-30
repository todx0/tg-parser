import type { TelegramClient } from 'telegram';

// ======================
// Core Types
// ======================
export type Word = string;
export type Count = number;
export type Timestamp = string;
export type GroupId = string;
export type GroupName = string;
export type Trend = Map<Word, Count>;
export type TrendArray = [Word, Count];
export type GroupMap = Record<GroupName, GroupId>;
export type FilteredSet = Set<Word>;

// ======================
// Telegram Parser Module
// ======================
export interface ITelegramParser extends TelegramClient {
	getGroupName(chatId: Api.TypeEntityLike): Promise<string | null>;
	getUserChats(): Promise<GroupMap>;
}

// ======================
// Command Handler Module
// ======================
export interface ICommandHandler {
	handleCommand(message: string, chatId: GroupId): Promise<void>;
}
export type CommandMapping = Record<string, () => Promise<void>>;
export type CommandHandler = (params: string[], chatId: GroupId) => Promise<null>;

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

type WordMap = Record<Word, Count>;

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
}
