// Runs before `npm pack` / `npm publish` of packages/core: copies the root README and refuses to publish
// with placeholder metadata (npm provenance requires the real repository URL).
import { copyFileSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (JSON.stringify(pkg).includes('/OWNER/')) {
  console.error(
    'packages/core/package.json still has the OWNER placeholder in repository/homepage/bugs. Set your GitHub owner first.',
  );
  process.exit(1);
}
copyFileSync('../../README.md', 'README.md');
