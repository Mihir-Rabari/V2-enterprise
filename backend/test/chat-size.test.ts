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

test('shirt size maps to the store jeans chart (and back)', () => {
    const chart: [string, string[]][] = [['M', ['28']], ['L', ['30', '32']], ['XL', ['34']], ['XXL', ['36']], ['3XL', ['38']], ['4XL', ['40']], ['5XL', ['42']], ['6XL', ['44']]];
    for (const [letter, waists] of chart) {
        assert.deepEqual(sizesForSearch(letter, 'black jeans'), { sizes: waists, converted: true });
        for (const w of waists) assert.deepEqual(sizesForSearch(w, 'tshirt'), { sizes: [letter], converted: true });
    }
    assert.deepEqual(sizesForSearch('M', 'linen shirt'), { sizes: ['M'], converted: false });
    assert.deepEqual(sizesForSearch('32', 'pants'), { sizes: ['32'], converted: false });
});
