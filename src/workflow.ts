import type { Api } from 'telegram';
import { getMessageTextFromEvent, getChatId } from 'src/utils/utils';
import { createCommandHandler } from 'src/config';

export async function botWorkflow(event: Api.TypeUpdate): Promise<void> {
	const message = getMessageTextFromEvent(event);
	const chatId = getChatId(event);
	if (!message || !chatId) return;

	const commandHandler = await createCommandHandler();
	await commandHandler.handleCommand(message, chatId);
}
