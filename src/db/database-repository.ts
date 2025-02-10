import type { Database } from 'bun:sqlite';
import type { GroupId, Timestamp, GroupName, Word, Count, DatabaseObject, IRepository } from 'src/types';

export class Repository implements IRepository {
	constructor(private db: Database) {}

	public insertObjectToDB(data: DatabaseObject): void {
		this.insertGroup(data.groupId, data.groupName);
		this.insertTimestamp(data.timestamp);
		const timestampId = this.getTimestampId(data.timestamp);
		this.insertWordTrend(data.groupId, timestampId, data.word, data.count);
	}

	private insertGroup(groupId: GroupId, groupName: GroupName): void {
		this.db.run('INSERT OR IGNORE INTO groups (id, name) VALUES (?, ?)', [groupId, groupName]);
	}
	
	private insertTimestamp(timestamp: Timestamp): void {
		this.db.run('INSERT OR IGNORE INTO timestamps (timestamp) VALUES (?)', [timestamp]);
	}

	private getTimestampId(timestamp: Timestamp): number {
		const query = this.db.prepare('SELECT id FROM timestamps WHERE timestamp = ?');
		const result = query.get(timestamp) as { id: number } | undefined;
		if (!result) {
			throw new Error(`Timestamp '${timestamp}' not found after insertion attempt`);
		}
		return result.id;
	}

	private insertWordTrend(groupId: GroupId, timestampId: number, word: Word, count: Count): void {
		this.db.run('INSERT OR IGNORE INTO word_trends (group_id, timestamp_id, word, count) VALUES (?, ?, ?, ?)', [groupId, timestampId, word, count]);
	}
}
