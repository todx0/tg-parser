import type { IDatabseInitializer } from 'src/types';
import type { Database } from 'bun:sqlite';

export class DatabaseInitializer implements IDatabseInitializer {
	constructor(private db: Database) {}

	public init(): Database {
		this.createTables();
		return this.db;
	}

	private createTables(): void {
		const createTablesQueries = [
			`CREATE TABLE IF NOT EXISTS groups (
						id TEXT PRIMARY KEY,
						name TEXT NOT NULL UNIQUE
				);`,
			`CREATE TABLE IF NOT EXISTS timestamps (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						timestamp DATETIME NOT NULL UNIQUE
				);`,
			`CREATE TABLE IF NOT EXISTS word_trends (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						group_id TEXT NOT NULL,
						timestamp_id INTEGER NOT NULL,
						word TEXT NOT NULL,
						count INTEGER NOT NULL,
						FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
						FOREIGN KEY (timestamp_id) REFERENCES timestamps(id) ON DELETE CASCADE,
						UNIQUE(group_id, timestamp_id, word)
				);`,
		];

		for (const query of createTablesQueries) {
			this.db.run(query);
		}
	}
}
