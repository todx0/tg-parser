import { botWorkflow } from 'src/workflow';
import { telegramParser, trendManager } from 'src/config';

let scheduler: NodeJS.Timer;

(async () => {
	scheduler = trendManager.startDecayScheduler();
	await telegramParser.connect();
	telegramParser.addEventHandler(botWorkflow);
})();
