import { readLogoFolders } from './lib/logos.js';
import { validateFolders } from './lib/validate.js';

const { entities, errors, warnings } = validateFolders(readLogoFolders());

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);

const unverified = entities.filter((e) => !e.verified).length;
console.log(
  `\n${entities.length} entities, ${unverified} unverified, ${errors.length} errors, ${warnings.length} warnings`,
);
if (errors.length) process.exit(1);
