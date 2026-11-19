import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '../src/components');
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function stripComments(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
    return '';
  }
  const inlineComment = line.indexOf('//');
  if (inlineComment !== -1) {
    return line.slice(0, inlineComment);
  }
  return line;
}

let failed = false;

for (const file of readdirSync(dir)) {
  if (!file.endsWith('.tsx') && !file.endsWith('.jsx')) continue;
  const src = readFileSync(join(dir, file), 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const checkLine = stripComments(lines[i]);
    if (checkLine && emojiRegex.test(checkLine)) {
      console.error(`EMOJI ICON: ${file}:${i + 1}: ${lines[i].trim()}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('No emoji icon anti-patterns found.');
