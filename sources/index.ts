import { ngBanks } from './ng-banks.js';
import { ng } from './ng.js';
import type { SourceList } from './types.js';

/** Every country with a canonical source list. Adding a country = one new file here. */
export const SOURCES: SourceList[] = [ngBanks, ng];
