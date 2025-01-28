import { TelegramClient } from 'telegram';
import { Api } from 'telegram';
import type { TelegramParserT, GroupMap, GroupId } from 'src/types';

export class TelegramParser extends TelegramClient implements TelegramParserT {
	async sendMessageTo(groupId: GroupId, message: string): Promise<void> {
		await this.sendMessage(groupId, { message: message });
	}

	async getGroupName(chatId: Api.TypeEntityLike): Promise<string | null> {
		const entity = await this.getEntity(chatId);
		if (entity.className !== 'Channel') return null;
		return entity.title;
	}

	async getUserChats(): Promise<GroupMap> {
		const groupMap: GroupMap = {};

		const dialogs = await this.getDialogs();
		for (const dialog of dialogs) {
			const entity = dialog.entity;
			if (entity) {
				/**
				 * @TODO - Fix for regular groups.
				 * Currently only works with Api.Channel (i.e. large groups)
				 * 
 				if (entity instanceof Api.Chat) {
					groupMap[entity.title] = entity.id.toString();
				}  
				*/
				if (entity instanceof Api.Channel) {
					const groupId = `'-100${entity.id.toString()}`;
					groupMap[entity.title] = groupId;
				}
			}
		}
		return groupMap;
	}
}
