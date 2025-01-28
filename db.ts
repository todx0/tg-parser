import { DatabaseService } from '@src/db/database-service';

const dbname = Bun.env.DB_NAME;
if (!dbname) throw Error('AAAA');
const db = new DatabaseService(dbname);

db.createTableGroups();
db.createTableTimestamps();
db.createTableWordTrends();
