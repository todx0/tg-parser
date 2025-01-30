import type { Api } from 'telegram';
import { getMessageTextFromEvent, getChatId } from 'src/utils/utils';
import { commandHandler } from 'src/config';

export async function botWorkflow(event: Api.TypeUpdate): Promise<void> {
	const message = getMessageTextFromEvent(event);
	const chatId = getChatId(event);
	if (!message || !chatId) return;

	await commandHandler.handleCommand(message, chatId);

	/**
	 * @TODO Parse comments from news groups (microblog)
	 */
}
