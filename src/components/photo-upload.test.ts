import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { VISION_ACCEPT, needsVisionConversion } from '../utils/pantryVisionPicker.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('photo upload is discoverable', () => {
  it('chat empty state has a prominent "Snap your fridge" camera button', () => {
    const src = read('src/components/ChatEmptyState.tsx');
    assert.match(src, /CameraIcon/);
    assert.match(src, /t\('ai\.snapFridge'\)/);
    assert.match(src, /onClick=\{onSnapFridge\}/);
    const assistant = read('src/components/AICookingAssistant.tsx');
    assert.match(assistant, /onSnapFridge=\{handleAttachPantryImage\}/);
  });

  it('composer uses a camera icon with accessible label, tooltip and placeholder hint', () => {
    const src = read('src/components/ChatComposer.tsx');
    assert.doesNotMatch(src, /PaperclipIcon/);
    assert.match(src, /<CameraIcon/);
    assert.match(src, /aria-label=\{attachAriaLabel\}/);
    assert.match(src, /title=\{attachTitle \?\? attachAriaLabel\}/);
    assert.match(src, /placeholder=\{placeholder\}/);
    const assistant = read('src/components/AICookingAssistant.tsx');
    assert.match(assistant, /placeholder=\{t\('ai\.composerHint'\)\}/);
    assert.match(assistant, /attachTitle=\{t\('pantryVision\.attachTooltip'\)\}/);
  });

  it('landing page shows the photo line', () => {
    assert.match(read('src/components/MarketingLanding.tsx'), /t\('landing\.how\.photoLine'\)/);
  });

  it('file inputs accept any image (camera or library on iPhone), are not display:none, and normalise the file', () => {
    assert.equal(VISION_ACCEPT, 'image/*');
    const assistant = read('src/components/AICookingAssistant.tsx');
    assert.match(assistant, /accept=\{VISION_ACCEPT\}/);
    assert.doesNotMatch(assistant, /type="file"[\s\S]{0,120}className="hidden"/);
    assert.match(assistant, /prepareVisionImage\(file\)/);
    assert.match(read('src/components/PantryInventory.tsx'), /prepareVisionImage\(file\)/);
  });
});

describe('prepareVisionImage conversion rule', () => {
  it('passes small jpeg/png/webp through and converts HEIC, unknown types and big photos', () => {
    assert.equal(needsVisionConversion({ type: 'image/jpeg', size: 1_000_000 }), false);
    assert.equal(needsVisionConversion({ type: 'image/PNG', size: 1_000_000 }), false);
    assert.equal(needsVisionConversion({ type: 'image/webp', size: 10 }), false);
    assert.equal(needsVisionConversion({ type: 'image/heic', size: 1_000_000 }), true);
    assert.equal(needsVisionConversion({ type: '', size: 1_000_000 }), true);
    assert.equal(needsVisionConversion({ type: 'image/jpeg', size: 6_000_000 }), true);
  });
});
