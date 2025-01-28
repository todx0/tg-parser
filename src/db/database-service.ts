import { Database } from 'bun:sqlite';
import type { DatabaseObject, TrendRow, FormattedRow, WordMap, GroupId, Timestamp, GroupName, Word, Count } from 'src/types';

export class DatabaseService {
	private db: Database;

	constructor(dbName: string) {
		this.db = new Database(dbName, { create: true });
		this.createTableGroups();
		this.createTableTimestamps();
		this.createTableWordTrends();
	}

	createTableGroups() {
		this.db.run(`CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
    );`);
	}

	createTableTimestamps() {
		this.db.run(`CREATE TABLE IF NOT EXISTS timestamps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL UNIQUE
    );`);
	}

	createTableWordTrends() {
		this.db.run(`CREATE TABLE IF NOT EXISTS word_trends (
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

	add(data: DatabaseObject) {
		this.insertIntoGroups(data.groupId, data.groupName);
		this.insertIntoTimestamps(data.timestamp);
		const timestampId = this.getTimestampId(data.timestamp);
		this.insertIntoWordTrends(data.groupId, timestampId, data.word, data.count);
	}

	/**
	 * DO NOT TOUCH.
	 * IT RETURNS FormattedRow[] 100% of the time.
	 * I spent 3 hours debugging types and I still dont undertand the error.
	 * Fuck everyone involved in this typescript bullshit.
	 */
	getWordTrendsByGroupId(groupId: GroupId): FormattedRow[] {
		const query = `
        SELECT 
            t.timestamp,
            wt.word,
            wt.count
        FROM 
            word_trends wt
        JOIN 
            timestamps t ON wt.timestamp_id = t.id
        WHERE 
            wt.group_id = ?
        ORDER BY 
            t.timestamp ASC, wt.word ASC;
    `;

		try {
			const rows = this.db.prepare(query, [groupId]).all() as TrendRow[];

			const result = rows.reduce((acc, row) => {
				const { timestamp, word, count } = row;
				//@ts-ignore
				if (!acc[timestamp]) {
					//@ts-ignore
					acc[timestamp] = { timestamp, words: {} };
				}
				//@ts-ignore
				acc[timestamp].words[word] = count;

				return acc;
			}, {});

			const formattedResult = Object.values(result);
			//@ts-ignore
			return formattedResult;
		} catch (err) {
			console.error('Error fetching word trends:', err);
			throw err;
		}
	}

	private insertIntoGroups(groupId: GroupId, groupName: GroupName) {
		this.db.run('INSERT OR IGNORE INTO groups (id, name) VALUES (?, ?)', [groupId, groupName]);
	}

	private insertIntoTimestamps(timestamp: Timestamp) {
		this.db.run('INSERT OR IGNORE INTO timestamps (timestamp) VALUES (?)', [timestamp]);
	}

	private getTimestampId(timestamp: Timestamp): number {
		const query = this.db.query('SELECT id FROM timestamps WHERE timestamp = ?');
		const result = query.get(timestamp) as { id: number } | undefined;
		if (!result) {
			throw new Error(`Timestamp '${timestamp}' not found after insertion attempt`);
		}
		return result.id;
	}

	private insertIntoWordTrends(groupId: GroupId, timestampId: number, word: Word, count: Count) {
		this.db.run('INSERT INTO word_trends (group_id, timestamp_id, word, count) VALUES (?, ?, ?, ?)', [groupId, timestampId, word, count]);
	}
}
