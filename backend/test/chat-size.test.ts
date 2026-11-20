import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers/env';
import { normaliseSize, sizesForSearch } from '../src/modules/chat/chat.tools';

test('size words and casing normalise to catalogue labels', () => {
    assert.equal(normaliseSize('medium'), 'M');
    assert.equal(normaliseSize(' m '), 'M');
    assert.equal(normaliseSize('Extra Large'), 'XL');
    assert.equal(normaliseSize('2xl'), 'XXL');
    assert.equal(normaliseSize('32'), '32');
});

test('a letter size is converted to waist sizes when searching bottoms, never the other way for shirts', () => {
    assert.deepEqual(sizesForSearch('M', 'black jeans'), { sizes: ['30', '32'], converted: true });
    assert.deepEqual(sizesForSearch('M', 'linen shirt'), { sizes: ['M'], converted: false });
    assert.deepEqual(sizesForSearch('M', ''), { sizes: ['M'], converted: false });
});

test('a waist size is converted to letter sizes when searching tops', () => {
    const r = sizesForSearch('32', 'tshirt');
    assert.equal(r.converted, true);
    assert.deepEqual(r.sizes, ['M', 'L']);
    assert.deepEqual(sizesForSearch('32', 'pants'), { sizes: ['32'], converted: false });
});
