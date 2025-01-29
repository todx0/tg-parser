import type { Database } from 'bun:sqlite';
import type { TrendRow, FormattedRow, GroupId, Timestamp, GroupName, Word, Count, IDBRepo } from 'src/types';

export class Repository implements IDBRepo {
	constructor(private db: Database) {}

	insertGroup(groupId: GroupId, groupName: GroupName): void {
		this.db.run('INSERT OR IGNORE INTO groups (id, name) VALUES (?, ?)', [groupId, groupName]);
	}

	insertTimestamp(timestamp: Timestamp): void {
		this.db.run('INSERT OR IGNORE INTO timestamps (timestamp) VALUES (?)', [timestamp]);
	}

	getTimestampId(timestamp: Timestamp): number {
		const query = this.db.prepare('SELECT id FROM timestamps WHERE timestamp = ?');
		const result = query.get(timestamp) as { id: number } | undefined;
		if (!result) {
			throw new Error(`Timestamp '${timestamp}' not found after insertion attempt`);
		}
		return result.id;
	}

	insertWordTrend(groupId: GroupId, timestampId: number, word: Word, count: Count): void {
		this.db.run('INSERT OR IGNORE INTO word_trends (group_id, timestamp_id, word, count) VALUES (?, ?, ?, ?)', [groupId, timestampId, word, count]);
	}

	getWordTrendsByGroupId(groupId: string): FormattedRow[] {
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

			interface Result {
				[timestamp: string]: FormattedRow;
			}
			const result = rows.reduce<Result>((acc, row) => {
				const { timestamp, word, count } = row;

				if (!acc[timestamp]) {
					acc[timestamp] = { timestamp, words: {} };
				}

				acc[timestamp].words[word] = count;

				return acc;
			}, {});

			return Object.values(result);
		} catch (err) {
			console.error('Error fetching word trends:', err);
			throw err;
		}
	}
}
