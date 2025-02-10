import { botWorkflow } from 'src/workflow';
import { tgClient } from 'src/config';

(async () => {
	await tgClient.connect();
	tgClient.addEventHandler(botWorkflow);
})();
