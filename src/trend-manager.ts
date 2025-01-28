import { Redis } from 'ioredis';
import type { Trends } from 'src/types';

export class TrendManager {
	private redis: Redis;
	private readonly DECAY_FACTOR = 0.95; // 5% decay per hour
	private readonly KEY_PREFIX = 'trends:';

	constructor(redisUrl: string) {
		this.redis = new Redis(redisUrl);
	}

	private serializeGroupTrends(trends: Trends.GroupTrends): string {
		const obj: Trends.Serialized = {};
		for (const [groupId, trend] of trends) {
			obj[groupId] = Object.fromEntries(trend);
		}
		return JSON.stringify(obj);
	}

	private deserializeGroupTrends(data: string): Trends.GroupTrends {
		const obj = JSON.parse(data) as Trends.Serialized;
		const trends = new Map<Trends.GroupId, Trends.Trend>();

		for (const [groupId, trendObj] of Object.entries(obj)) {
			trends.set(groupId, new Map(Object.entries(trendObj).map(([word, count]) => [word, Number(count)])));
		}
		return trends;
	}

	async updateTrends(groupId: Trends.GroupId, words: Trends.Word[]): Promise<void> {
		const key = `${this.KEY_PREFIX}${groupId}`;

		let groupTrends: Trends.Trend;
		const existingData = await this.redis.get(key);

		if (existingData) {
			const allTrends = this.deserializeGroupTrends(existingData);
			groupTrends = allTrends.get(groupId) || new Map();
		} else {
			groupTrends = new Map();
		}

		for (const word of words) {
			const currentCount = groupTrends.get(word) || 0;
			groupTrends.set(word, currentCount + 1);
		}

		const updatedTrends = new Map([[groupId, groupTrends]]);
		await this.redis.set(key, this.serializeGroupTrends(updatedTrends));
	}

	async getTrends(groupId: Trends.GroupId): Promise<Trends.Trend | null> {
		const key = `${this.KEY_PREFIX}${groupId}`;
		const data = await this.redis.get(key);

		if (!data) return null;

		const trends = this.deserializeGroupTrends(data);
		return trends.get(groupId) || null;
	}

	async getTrendingWords(groupId: Trends.GroupId): Promise<string[] | null> {
		const trends = await this.getTrends(groupId);

		if (!trends) return null;

		return [...trends]
			.filter(([, v]) => v >= 1)
			.sort(([, a], [, b]) => b - a)
			.map((v) => v[0]);
	}

	async applyDecay(): Promise<void> {
		const keys = await this.redis.keys(`${this.KEY_PREFIX}*`);

		for (const key of keys) {
			const data = await this.redis.get(key);
			if (!data) continue;

			const trends = this.deserializeGroupTrends(data);

			for (const [groupId, trend] of trends) {
				const decayedTrend = new Map<Trends.Word, Trends.Count>();

				for (const [word, count] of trend) {
					const decayedCount = Math.max(0.1, count * this.DECAY_FACTOR);

					if (decayedCount >= 1) {
						decayedTrend.set(word, Math.round(decayedCount * 100) / 100);
					}
				}

				trends.set(groupId, decayedTrend);
			}

			await this.redis.set(key, this.serializeGroupTrends(trends));
		}
	}

	filterTrends(trends: Trends.Trend): Trends.Trend {
		return new Map([...trends].filter(([, value]) => value > 3).sort(([, valueA], [, valueB]) => valueB - valueA));
	}

	startDecayScheduler(): NodeJS.Timer {
		return setInterval(
			() => {
				this.applyDecay().catch(console.error);
			},
			2 * 60 * 60 * 1000,
		);
	}

	async close(): Promise<void> {
		await this.redis.quit();
	}
}
