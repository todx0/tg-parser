import type { GroupId, ITelegramParser, ICommandHandler, IDatabaseService, ICommand } from 'src/types';
import {
	MapCommand,
	ScanDaysCommand,
	GraphCommand,
	ScanLimitCommand,
	GetTopicsCommand,
	GetEntityCommand,
	GetTopicReplies,
} from 'src/commands/commands';

export class CommandHandler implements ICommandHandler {
	private commandMapping: Record<string, ICommand>;

	constructor(
		private telegramParser: ITelegramParser,
		private databaseService: IDatabaseService,
	) {
		this.commandMapping = {
			map: new MapCommand(this.telegramParser),
			scan_days: new ScanDaysCommand(this.telegramParser, this.databaseService),
			scan_limit: new ScanLimitCommand(this.telegramParser, this.databaseService),
			graph: new GraphCommand(this.telegramParser, this.databaseService),
			entity: new GetEntityCommand(this.telegramParser),
			topics: new GetTopicsCommand(this.telegramParser),
			topic_replies: new GetTopicReplies(this.telegramParser),
		};
	}

	public async handleCommand(message: string, chatId: GroupId): Promise<void> {
		const parsed = this.parseCommand(message);
		if (!parsed) return;

		const command = this.commandMapping[parsed.command];
		if (command) await command.execute(parsed.params, chatId);
	}

	private parseCommand(message: string) {
		if (!message.startsWith('/')) return null;
		const [command, ...params] = message.trim().slice(1).split(' ');
		return { command, params };
	}
}
