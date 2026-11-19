import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { describeVisionFailure } from './pantryVisionPicker.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('describeVisionFailure', () => {
    it('maps quota / plan gates to an upgrade message', () => {
        assert.equal(
            describeVisionFailure({ success: false, statusCode: 403, message: 'Image upload quota exceeded for this month' }),
            'upgrade',
        );
        assert.equal(describeVisionFailure({ success: false, message: 'Upgrade to Pro' }), 'upgrade');
    });

    it('maps auth failures to sign-in and everything else to other', () => {
        assert.equal(describeVisionFailure({ success: false, statusCode: 401 }), 'sign_in');
        assert.equal(describeVisionFailure({ success: false, statusCode: 503, message: 'Vision recognition failed' }), 'other');
    });
});

describe('Scan groceries button is never dead', () => {
    const src = readFileSync(join(root, 'src/components/PantryInventory.tsx'), 'utf8');

    it('does not hide the file input with display:none', () => {
        const input = src.slice(src.indexOf('id="pantry-vision-input"'), src.indexOf('id="pantry-vision-input"') + 400);
        assert.match(input, /className="sr-only"/);
        assert.doesNotMatch(input, /className="hidden"/);
    });

    it('activates the input via a native label and a visible fallback error', () => {
        assert.match(src, /<label\s+htmlFor="pantry-vision-input"/);
        assert.match(src, /pantryVision\.pickerUnavailable/);
        assert.match(src, /pantryVision\.upgradeRequired/);
    });

    it('surfaces failed recognitions instead of swallowing them', () => {
        assert.match(src, /setRecognizeError\(/);
        assert.match(src, /role="alert"/);
    });
});
