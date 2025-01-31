import type { Database } from 'bun:sqlite';
import type { FormattedRow, DailyWords, GroupName, DatabaseObject, TrendRow, IDatabaseService } from 'src/types';
import { Repository } from 'src/db/database-repository';
import { DatabaseInitializer } from 'src/db/database-initializer';

export class DatabaseService implements IDatabaseService {
	private readonly repository: Repository;

	constructor(private readonly db: Database) {
		const initializer = new DatabaseInitializer(db);
		this.db = initializer.init();
		this.repository = new Repository(this.db);
	}

	public addDailyWordsToDB(groupId: string, groupName: GroupName, dailyWords: DailyWords): void {
		this.db.transaction(() => {
			for (const { date, words } of dailyWords) {
				for (const [word, count] of words) {
					const dbObject: DatabaseObject = {
						groupId,
						groupName,
						timestamp: date,
						word,
						count,
					};
					this.repository.insertObjectToDB(dbObject);
				}
			}
		})();
	}

	public getWordTrendsByGroupId(groupId: string): FormattedRow[] {
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
			const rows = this.db.prepare(query).all(groupId) as TrendRow[];
			return Object.values(
				rows.reduce<Record<string, FormattedRow>>((acc, { timestamp, word, count }) => {
					if (!acc[timestamp]) {
						acc[timestamp] = { timestamp, words: {} };
					}
					acc[timestamp].words[word] = count;
					return acc;
				}, {}),
			);
		} catch (error) {
			console.error('Error fetching word trends:', error);
			throw error;
		}
	}
}
