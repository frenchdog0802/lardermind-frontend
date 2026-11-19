import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    hasEmptyIngredientName,
    normalizeSearchText,
    searchIngredientNames,
} from './ingredientSearch.ts';

describe('searchIngredientNames', () => {
    it('suggests eggs for Egg / egg / Eggs even with an empty catalog', () => {
        for (const q of ['Egg', 'egg', 'Eggs', 'EGGS']) {
            const names = searchIngredientNames(q, []).map((i) => i.name);
            assert.ok(names.includes('Egg'), `${q} -> ${names.join(',')}`);
        }
    });

    it('matches singular queries against plural catalog names and vice versa', () => {
        const catalog = [
            { id: '1', name: 'Tomatoes', default_unit: 'pcs' },
            { id: '2', name: 'Egg', default_unit: 'pcs' },
        ];
        assert.equal(searchIngredientNames('tomato', catalog)[0]?.id, '1');
        assert.equal(searchIngredientNames('eggs', catalog)[0]?.id, '2');
    });

    it('prefers catalog rows and does not duplicate a common ingredient the catalog has', () => {
        const catalog = [{ id: '9', name: 'Eggs', default_unit: 'pcs' }];
        const out = searchIngredientNames('egg', catalog);
        assert.equal(out.filter((i) => normalizeSearchText(i.name) === 'egg').length, 1);
        assert.equal(out[0]?.id, '9');
    });

    it('keeps substring matching for non-ASCII names and caps results', () => {
        const catalog = [{ id: '3', name: '雞蛋', default_unit: 'pcs' }];
        assert.equal(searchIngredientNames('蛋', catalog)[0]?.id, '3');
        assert.ok(searchIngredientNames('', catalog, 5).length <= 5);
    });
});

describe('hasEmptyIngredientName', () => {
    it('is false once every ingredient has a name, so Save is not blocked', () => {
        assert.equal(hasEmptyIngredientName([{ name: 'egg' }, { name: '' }]), true);
        assert.equal(hasEmptyIngredientName([{ name: 'egg' }, { name: ' milk ' }]), false);
        assert.equal(hasEmptyIngredientName([]), false);
    });
});
