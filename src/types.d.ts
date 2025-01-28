// ======================
// Core Types
// ======================

type Word = string;

type Count = number;

/** Represents a word and its occurrence count */
type WordCount = [word: Word, count: Count];

/** Represents a timestamp in string format */
type Timestamp = string;

/** Represents a group ID (unique identifier for a group) */
type GroupId = string;

/** Represents a group name (human-readable name for a group) */
type GroupName = string;

// ======================
// Trends Module
// ======================

type Trend = Map<Word, Count>;
type GroupTrends = Map<GroupId, Trend>;
type TrendArray = [Word, Count];

interface SerializedTrends {
	[groupId: GroupId]: {
		[word: Word]: Count;
	};
}

// ======================
// Telegram Parser Module
// ======================

interface TelegramParserT extends TelegramClient {
	sendMessageTo(groupId: GroupId, message: string): Promise<void>;
	getGroupName(chatId: Api.TypeEntityLike): Promise<string | null>;
	getUserChats(): Promise<GroupMap>;
}

type GroupMap = Record<GroupName, GroupId>;

// ======================
// Workflow Module
// ======================

interface ParsedCommand {
	command: string;
	params: string[];
}

type CommandHandler = (params: string[], chatId: GroupId) => Promise<null>;

interface CommandHandlers {
	[key: string]: CommandHandler;
}

// ======================
// Filters Module
// ======================

type FilteredSet = Set<Word>;

// ======================
// Database Module
// ======================

interface DatabaseObject {
	groupId: GroupId;
	groupName: GroupName;
	timestamp: Timestamp;
	word: Word;
	count: Count;
}

type WordMap = Record<Word, Count>;
//type TrendRow = Record<Timestamp, WordMap>;
type TrendRow = {
	timestamp: Timestamp;
	word: Word;
	count: Count;
};
//type FormattedRow = Record<Timestamp, WordMap>;
interface FormattedRow {
  timestamp: Timestamp;
  words: WordMap;
}

// ======================
// Export Everything
// ======================

export type {
	// Core Types
	Word,
	Count,
	WordCount,
	Timestamp,
	GroupId,
	GroupName,
	// Trends Module
	Trend,
	TrendArray,
	GroupTrends,
	SerializedTrends,
	// Telegram Parser Module
	TelegramParserT,
	GroupMap,
	// Workflow Module
	ParsedCommand,
	CommandHandler,
	CommandHandlers,
	// Filters Module
	FilteredSet,
	// Database Module
	DatabaseObject,
	WordMap,
	TrendRow,
	FormattedRow,
};
