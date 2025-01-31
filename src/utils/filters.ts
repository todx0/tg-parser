import type { FilteredSet } from 'src/types';
import { readFile } from 'node:fs/promises';
import { filterFilePath } from 'src/config';

export async function createFilteredSet(): Promise<FilteredSet> {
	const file = await readFile(filterFilePath);
	const filteredSet = new Set(file.toString().split('\n'));
	return filteredSet;
}
