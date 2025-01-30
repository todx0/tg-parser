import { botWorkflow } from 'src/workflow';
import { telegramParser } from 'src/config';

(async () => {
	await telegramParser.connect();
	telegramParser.addEventHandler(botWorkflow);
})();
