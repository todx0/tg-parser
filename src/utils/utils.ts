import type { Api } from 'telegram';
import type { FormattedRow, TrendArray, Word, Trend, DailyWords } from 'src/types';
import nodeHtmlToImage from 'node-html-to-image';
import { writeFile, readFile } from 'node:fs/promises';
import { filteredSet } from 'src/utils/filters';

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

export async function generateTrendsImage(htmlTable: string) {
	const imageBuffer = await nodeHtmlToImage({
		html: htmlTable,
		type: 'png',
		transparent: false,
	});

	const filepath = 'table.png';
	await writeFile(filepath, imageBuffer);
	return filepath;
}

export async function generateChartImage(formattedResult: FormattedRow[]) {
	const htmlTemplate = await readFile('src/html/chart-template.html', 'utf8');

	const htmlContent = htmlTemplate.replace('{{data}}', JSON.stringify(formattedResult));

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

	const filepath = 'chart.png';
	await writeFile(filepath, imageBuffer);
	return filepath;
}

export function generateHtmlFromWords(trendsArr: TrendArray[], groupName: string): string {
	return `
	<html>
			<head>
					<style>
							/* General body styling */
							body {
									font-family: 'Arial', sans-serif;
									background-color: #f9f9f9;
									margin: 0;
									padding: 20px;
							}

							/* Group Name Header */
							.group-name-header {
									font-size: 24px;
									font-weight: bold;
									color: #ffffff;
									background: linear-gradient(135deg, #6a11cb, #2575fc);
									padding: 15px;
									text-align: center;
									border-radius: 8px;
									margin-bottom: 20px;
									box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
							}

							/* Table styling */
							table {
									width: 100%;
									border-collapse: collapse;
									background-color: #ffffff;
									border-radius: 8px;
									overflow: hidden;
									box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
							}

							/* Table header styling */
							th {
									background: linear-gradient(135deg, #6a11cb, #2575fc);
									color: #ffffff;
									font-weight: bold;
									padding: 12px;
									text-align: left;
							}

							/* Table row styling */
							td {
									padding: 12px;
									border-bottom: 1px solid #dddddd;
							}

							/* Alternate row coloring */
							tr:nth-child(even) {
									background-color: #f9f9f9;
							}

							/* Hover effect for rows */
							tr:hover {
									background-color: #f1f1f1;
							}

							/* Add some spacing and alignment */
							td:first-child, th:first-child {
									padding-left: 20px;
							}

							td:last-child, th:last-child {
									padding-right: 20px;
							}
					</style>
			</head>
			<body>
					<!-- Group Name Header -->
					<div class="group-name-header">
							${groupName}
					</div>

					<!-- Table -->
					<table>
							<tr>
									<th>Word</th>
									<th>Count</th>
							</tr>
							${trendsArr
								.map(
									(row: TrendArray) => `
											<tr>
													<td>${row[0]}</td>
													<td>${Math.floor(row[1])}</td>
											</tr>
									`,
								)
								.join('')}
					</table>
			</body>
	</html>
`;
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
	return new Map([...trends].filter(([, value]) => value > 3).sort(([, valueA], [, valueB]) => valueB - valueA));
}

export function convertMessagesToDailyWords(messages: Api.Message[]): DailyWords {
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
	const dailyWordsMapped = dailyWordsArr.map((o) => ({ date: o.date, words: Array.from(filterTrends(getMapFromWords(o.words))) }));
	return dailyWordsMapped;
}

export function getTimestampMinusNDays(days: string): number {
	return Math.floor(Date.now() / 1000) - Number.parseInt(days) * 24 * 60 * 60;
}