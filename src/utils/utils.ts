import type { Api } from 'telegram';
import type { FormattedRow, TrendArray, Word, Trend, DailyWords, GroupName } from 'src/types';
import nodeHtmlToImage from 'node-html-to-image';
import { writeFile, readFile } from 'node:fs/promises';
import { createFilteredSet } from 'src/utils/filters';

export function getMessageTextFromEvent(event: Api.TypeUpdate): string | undefined {
	if (event.className === 'UpdateNewChannelMessage') {
		const message = event.message;
		if (message && message.className === 'Message') {
			return message.message;
		}
	}
	return undefined;
}

export function getChatId(event: Api.TypeUpdate): string | undefined {
	if (event.className === 'UpdateNewChannelMessage') {
		const message = event.message;
		if (message && message.className === 'Message') {
			return String(message.chatId);
		}
	}
	return undefined;
}

export function parseMessageToWordsArray(message: string, filter: Set<string>): string[] {
	if (!message) return [];
	const words = message.split(/\s+/);
	const sanitizedWords = sanitizeWords(words);
	const filteredWords = filterWords(sanitizedWords, filter);
	return filteredWords;
}

export function filterWords(words: string[], filteredWords: Set<string>): string[] {
	return words.filter((word) => !filteredWords.has(word) && word.length >= 2 && word.length <= 8 && word !== null);
}

export function sanitizeWords(words: string[]): string[] {
	return words.map((word) =>
		word
			.toString()
			.toLocaleLowerCase()
			.replace(/[^a-zA-Zа-яА-ЯёЁ]/gi, ''),
	);
}

export async function generateChartImage(htmlContent: string) {
	const imageBuffer = await nodeHtmlToImage({
		html: htmlContent,
		type: 'png',
		transparent: false,
		quality: 100,
		puppeteerArgs: {
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
			defaultViewport: {
				width: 1400,
				height: 600,
				deviceScaleFactor: 2,
			},
		},
	});

	const filepath = 'chart-table.png';
	await writeFile(filepath, imageBuffer);

	return filepath;
}

export async function generateChartHtml(formattedResult: FormattedRow[], groupName: GroupName): Promise<string> {
	const htmlTemplate = await readFile('src/html/chart-template.html', 'utf8');

	const htmlContent = htmlTemplate.replace('{{data}}', JSON.stringify(formattedResult)).replace('{{groupName}}', groupName);

	return htmlContent;
}

export async function generateWordsHtml(trendsArr: TrendArray[], groupName: GroupName): Promise<string> {
	const htmlTemplate = await readFile('src/html/words-template.html', 'utf8');

	const rows = trendsArr
		.map(
			(row: TrendArray) => `
				<tr>
					<td>${row[0]}</td>
					<td>${Math.floor(row[1])}</td>
				</tr>
			`,
		)
		.join('');

	const htmlContent = htmlTemplate.replace('{{groupName}}', groupName).replace('{{rows}}', rows);

	return htmlContent;
}

export async function generateWordsImage(htmlContent: string): Promise<string> {
	const imageBuffer = await nodeHtmlToImage({
		html: htmlContent,
		type: 'png',
		transparent: false,
	});

	const filepath = 'words-table.png';
	await writeFile(filepath, imageBuffer);

	return filepath;
}

export function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp * 1000);

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

export function getMapFromWords(words: Word[]): Trend {
	const map = new Map();
	for (const word of words) {
		const currentCount = map.get(word) || 0;
		map.set(word, currentCount + 1);
	}
	return map;
}

export function filterTrends(trends: Trend): Trend {
	// HARDCODED VALUE 3!!!
	return new Map([...trends].filter(([, value]) => value > 3).sort(([, valueA], [, valueB]) => valueB - valueA));
}

export async function convertMessagesToDailyWords(messages: Api.Message[]): Promise<DailyWords> {
	const filteredSet = await createFilteredSet();
	const dailyWords = messages
		.map((message) => ({ date: formatTimestamp(message.date), words: parseMessageToWordsArray(message.message, filteredSet) }))
		.filter((message) => message.words.length > 1)
		.reduce(
			(acc, item) => {
				if (acc[item.date]) {
					acc[item.date].words.push(...item.words);
				} else {
					acc[item.date] = { date: item.date, words: [...item.words] };
				}
				return acc;
			},
			{} as Record<string, { date: string; words: string[] }>,
		);

	const dailyWordsArr = Object.values(dailyWords);

	//const dailyWordsMapped = dailyWordsArr.map((o) => ({ date: o.date, words: Array.from(filterTrends(getMapFromWords(o.words))) }));
	const dailyWordsMapped = dailyWordsArr.map((o) => {
		const date = o.date;
		const words = o.words;
		const wordsMap = getMapFromWords(words);
		const filteredTrends = filterTrends(wordsMap);
		const filteredTrendsArray = Array.from(filteredTrends);
		return {
			date: date,
			words: filteredTrendsArray,
		};
	});

	return dailyWordsMapped;
}

export function getTimestampMinusNDays(days: string): number {
	return Math.floor(Date.now() / 1000) - Number.parseInt(days) * 24 * 60 * 60;
}

export function getEnvVariable(key: string): string {
	const value = Bun.env[key];
	if (!value) {
		throw new Error(`Environment variable ${key} is missing`);
	}
	return value;
}
