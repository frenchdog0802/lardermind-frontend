import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chatLanguageTag } from './chatLanguage.ts';

const read = (p: string) => readFileSync(join(dirname(fileURLToPath(import.meta.url)), p), 'utf8');

describe('chat language tag', () => {
  it('maps the app language to the tag the backend understands', () => {
    assert.equal(chatLanguageTag('zh'), 'zh-TW');
    assert.equal(chatLanguageTag('zh-TW'), 'zh-TW');
    assert.equal(chatLanguageTag('ZH-cn'), 'zh-TW');
    assert.equal(chatLanguageTag('en'), 'en');
    assert.equal(chatLanguageTag('en-US'), 'en');
  });

  it('omits the field when the language is unknown', () => {
    assert.equal(chatLanguageTag(undefined), undefined);
    assert.equal(chatLanguageTag(''), undefined);
    assert.equal(chatLanguageTag('fr'), undefined);
  });

  it('is sent on send, stream and resume requests', () => {
    const chat = read('chat.ts');
    assert.match(chat, /language\?: string/);
    assert.match(chat, /function withClientContext[\s\S]*language/);
    assert.match(chat, /'\/api\/chat\/send'[\s\S]*withClientContext\(data\)/);
    assert.match(chat, /\/api\/chat\/stream[\s\S]*withClientContext\(data\)/);
    assert.match(chat, /'\/api\/chat\/resume'[\s\S]*withResumeContext\(data\)/);
  });
});
