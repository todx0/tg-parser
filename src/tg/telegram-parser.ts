import { TelegramClient } from 'telegram';
import { Api } from 'telegram';
import { generateMessagesHtml } from 'src/utils/utils';
import type { ITelegramParser, GroupMap, MessageForTemplate } from 'src/types';



/**
 * @TODO Parse comments from news groups (microblog)
 */
export class TG extends TelegramClient implements ITelegramParser {
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

	public async getTopics(chatId: Api.TypeEntityLike): Promise<GroupMap> {
		const entity = await this.invoke(
			new Api.messages.GetHistory({
				peer: chatId,
			}),
		);
		const mapping: GroupMap = {};
		if (entity instanceof Api.messages.ChannelMessages) {
			for (const topic of entity.topics) {
				if (topic instanceof Api.ForumTopic) {
					mapping[topic.title] = String(topic.id);
				}
			}
		}
		return mapping;
	}

	public async getMessagesFromTopic(chatId: Api.TypeEntityLike, topicId: number, limit?: number) {
		if (!chatId || !topicId) throw Error('No Chat Id or Topic Id provided.');

		const getRepliesResponse = (await this.fetchTopicMessages(chatId, topicId, limit || undefined)) as Api.messages.ChannelMessages;

		const title = this.getTitle(getRepliesResponse);

		const processedReplies = await this.processReplies(getRepliesResponse, chatId, topicId);

		const htmlContent = await generateMessagesHtml(title, processedReplies.reverse());
		const topicHtmlName = `${title.toLocaleLowerCase().replaceAll(' ', '_')}.html`;

		await Bun.write(topicHtmlName, htmlContent);

		return topicHtmlName;
	}

	////// private

	private async fetchTopicMessages(chatId: Api.TypeEntityLike, topicId: number, limit?: number): Promise<Api.messages.ChannelMessages> {
		const getRepliesResponse = await this.invoke(
			new Api.messages.GetReplies({
				peer: chatId,
				msgId: topicId,
				limit: limit,
			}),
		);
		return getRepliesResponse as Api.messages.ChannelMessages;
	}

	private getTitle(getRepliesResponse: unknown) {
		if (getRepliesResponse instanceof Api.messages.ChannelMessages) {
			if (getRepliesResponse.topics[0] instanceof Api.ForumTopic) {
				return getRepliesResponse.topics[0].title;
			}
		}
		throw Error('No title found');
	}

	private async processReplies(
		getRepliesResponse: Api.messages.ChannelMessages,
		chatId: Api.TypeEntityLike,
		topicId: number,
	): Promise<MessageForTemplate[]> {
		const mapped: MessageForTemplate[] = [];

		for (const message of getRepliesResponse.messages) {
			if (!(message instanceof Api.MessageService || message instanceof Api.MessageEmpty)) {
				const processedMessage = await this.processMessage(message, chatId, topicId);
				if (processedMessage) mapped.push(processedMessage);
			}
		}
		return mapped;
	}

	private async processMessage(message: Api.Message, chatId: Api.TypeEntityLike, topicId: number): Promise<MessageForTemplate | null> {
		if (!(message.fromId instanceof Api.PeerUser)) {
			return null;
		}

		const userEntity = await this.getUserEntity(Number(message.fromId.userId));
		if (!userEntity?.firstName) {
			return null;
		}

		if (message.media instanceof Api.MessageMediaPhoto) {
			return this.processPhotoMessage(message, userEntity, chatId, topicId);
		}

		return this.processTextMessage(message, userEntity);
	}

	private async processPhotoMessage(
		message: Api.Message,
		userEntity: Api.User,
		chatId: Api.TypeEntityLike,
		topicId: number,
	): Promise<MessageForTemplate | null> {
		if (!(message.media instanceof Api.MessageMediaPhoto) || !(message.media.photo instanceof Api.Photo) || !userEntity.firstName) return null;

		const photo = message.media.photo;
		const buffer = await this.downloadPhotoBuffer(photo);

		if (!buffer) {
			throw new Error('Buffer is undefined');
		}

		const filepath = `media/${chatId}/${topicId}/${message.id}.jpeg`;
		await Bun.write(filepath, buffer);

		return {
			id: message.id,
			name: userEntity.firstName,
			media: filepath,
			text: message.message,
		};
	}

	private async downloadPhotoBuffer(photo: Api.Photo): Promise<string | Buffer | undefined> {
		return this.downloadFile(
			new Api.InputPhotoFileLocation({
				id: photo.id,
				accessHash: photo.accessHash,
				fileReference: photo.fileReference,
				thumbSize: 'y',
			}),
			{
				dcId: photo.dcId,
			},
		);
	}

	private async getUserEntity(userId: number): Promise<Api.User | null> {
		const userEntity = await this.getEntity(userId);
		if (!(userEntity instanceof Api.User)) throw Error('No user firstname found.');
		return userEntity;
	}

	private processTextMessage(message: Api.Message, userEntity: Api.User): MessageForTemplate | null {
		if (!userEntity.firstName) return null;
		if (!message.message) return null;
		return {
			id: message.id,
			name: userEntity.firstName,
			text: message.message,
		};
	}
}
