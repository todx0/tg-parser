import type { FilteredSet } from 'src/types';
import { readFile } from 'node:fs/promises';
import { filterFilePath } from 'src/config';

async function readFilterFile(filepath: string) {
	const file = await readFile(filepath);
	const filteredSet = new Set(file.toString().split('\n'));
	return filteredSet;
}

export const filteredSet: FilteredSet = await readFilterFile(filterFilePath);
