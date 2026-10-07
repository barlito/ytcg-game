import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderCardsDoc } from './cards-doc.ts';
import { loadDataDir } from './data.ts';

export const CARDS_DOC = fileURLToPath(new URL('../../../../docs/cards.md', import.meta.url));

writeFileSync(CARDS_DOC, renderCardsDoc(loadDataDir()));
console.log(`docs/cards.md régénéré`);
