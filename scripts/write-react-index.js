const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const distReact = path.join(root, 'dist', 'react');
const source = path.join(__dirname, 'react-index.ts');
const indexTs = path.join(distReact, 'index.ts');

fs.mkdirSync(distReact, { recursive: true });
fs.copyFileSync(source, indexTs);

execSync('npx tsc -p tsconfig.react-entry.json', { cwd: root, stdio: 'inherit' });

fs.unlinkSync(indexTs);
