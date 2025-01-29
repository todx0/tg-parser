import type { Database } from 'bun:sqlite';
import type { DatabaseObject, FormattedRow, DailyWords, GroupId, GroupName } from 'src/types';
import { Repository } from 'src/db/database-repository';

export class DatabaseService {
	private repository: Repository;

	constructor(db: Database) {
		this.repository = new Repository(db);
		this.initializeDatabase(db);
	}

	add(data: DatabaseObject) {
		this.repository.insertGroup(data.groupId, data.groupName);
		this.repository.insertTimestamp(data.timestamp);
		const timestampId = this.repository.getTimestampId(data.timestamp);
		this.repository.insertWordTrend(data.groupId, timestampId, data.word, data.count);
	}

	getWordTrendsByGroupId(groupId: GroupId): FormattedRow[] {
		return this.repository.getWordTrendsByGroupId(groupId);
	}

	addDailyWordsToDB(groupId: string, groupName: GroupName, dailyWords: DailyWords): void {
		for (const object of dailyWords) {
			for (const trend of object.words) {
				const [word, count] = trend;
				const dbObject: DatabaseObject = {
					groupId: groupId,
					groupName: groupName,
					timestamp: object.date,
					word: word,
					count: count,
				};
				this.add(dbObject);
			}
		}
	}

	private initializeDatabase(db: Database) {
		this.createTableGroups(db);
		this.createTableTimestamps(db);
		this.createTableWordTrends(db);
	}

	private createTableGroups(db: Database) {
		db.run(`CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
    );`);
	}

	private createTableTimestamps(db: Database) {
		db.run(`CREATE TABLE IF NOT EXISTS timestamps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL UNIQUE
    );`);
	}

	private createTableWordTrends(db: Database) {
		db.run(`CREATE TABLE IF NOT EXISTS word_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL,
    timestamp_id INTEGER NOT NULL,
    word TEXT NOT NULL,
    count INTEGER NOT NULL,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (timestamp_id) REFERENCES timestamps(id) ON DELETE CASCADE,
    UNIQUE(group_id, timestamp_id, word)
    );`);
	}
}
