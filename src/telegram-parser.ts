import { TelegramClient } from 'telegram';
import { Api } from 'telegram';
import type { ITelegramParser, GroupMap } from 'src/types';

export class TelegramParser extends TelegramClient implements ITelegramParser {
	public async getGroupName(chatId: Api.TypeEntityLike): Promise<string | null> {
		const entity = await this.getEntity(chatId);
		if (!entity) return null;
		if (entity instanceof Api.Channel || entity instanceof Api.Chat) {
			return entity.title;
		}
		return null;
	}

	public async getUserChats(): Promise<GroupMap> {
		const groupMap: GroupMap = {};

		const dialogs = await this.getDialogs();
		for (const dialog of dialogs) {
			const entity = dialog.entity;
			if (entity) {
				/**
				 * @TODO - Fix for regular groups.
				 * Currently only works with Api.Channel (i.e. large groups)
				 * !!! For some reason gives incorrect group id
				 *
				 *
				if (entity instanceof Api.Chat) {
					groupMap[entity.title] = entity.id.toString();
				} */

				if (entity instanceof Api.Channel) {
					const groupId = `'-100${entity.id.toString()}`;
					groupMap[entity.title] = groupId;
				}
			}
		}
		return groupMap;
	}
}
