import { readFileSync, globSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';

const document = YAML.parseDocument(readFileSync('.coderabbit.yaml', 'utf8'));
if (document.errors.length) throw new Error(document.errors.map((error) => error.message).join('\n'));
const config = document.toJS();
if (config.tone_instructions.length > 250) throw new Error('Review tone exceeds 250 characters');
const tracked = new Set(execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0'));
for (const item of config.reviews.path_instructions) {
  if (![...globSync(item.path)].some((path) => tracked.has(path))) {
    throw new Error(`Review path has no tracked match: ${item.path}`);
  }
}
console.log('Review configuration: valid YAML, tone, and path matches');
