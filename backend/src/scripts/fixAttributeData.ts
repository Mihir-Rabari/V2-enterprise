/**
 * One-off data fixes for catalogue attributes. Dry run by default; add --apply to change data.
 *
 *   rename-key   <oldKey> <newKey> "<New Label>"   rename a custom attribute everywhere
 *   merge-value  <field> "<from>" "<to>"            make one spelling of a field value the other
 *
 * Examples (from backend/):
 *   npm run fix:attributes -- rename-key outseam hip_size "Hip Size" --apply
 *   npm run fix:attributes -- merge-value fabric "HEAVY WEIGHT COTTON" "HEAVYWEIGHT COTTON" --apply
 *
 * After applying, the filter-suggestions document is rebuilt from the products so the shop
 * sidebar and admin pickers show the new names/values.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../models/Product';
import { FilterSuggestion } from '../models/FilterSuggestion';
import { Attribute } from '../models/Attribute';
import { rebuildFiltersFromAllProducts } from '../modules/filters/filters.service';

dotenv.config();

const MERGEABLE_FIELDS = ['fabric', 'patternType', 'collar', 'sleeve', 'neck', 'pocket', 'color', 'size'] as const;
const KEY = /^[a-z0-9_]+$/;

const run = async () => {
    const args = process.argv.slice(2);
    const apply = args.includes('--apply');
    const [command, ...params] = args.filter(a => !a.startsWith('--'));
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');

    if (command !== 'rename-key' && command !== 'merge-value') {
        throw new Error('Usage: rename-key <oldKey> <newKey> "<Label>"  |  merge-value <field> "<from>" "<to>"  [--apply]');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(apply ? 'APPLYING changes' : 'DRY RUN (add --apply to change anything)');

    if (command === 'rename-key') {
        const [oldKey, newKey, label] = params;
        if (!oldKey || !newKey || !label) throw new Error('rename-key needs <oldKey> <newKey> "<New Label>"');
        if (!KEY.test(oldKey) || !KEY.test(newKey)) throw new Error('Keys must be lower-case letters, digits and underscores.');
        const oldPath = `customAttributes.${oldKey}`, newPath = `customAttributes.${newKey}`;

        const clash = await Product.countDocuments({ [newPath]: { $exists: true } });
        if (clash > 0) throw new Error(`${clash} product(s) already have "${newKey}"; refusing to overwrite.`);
        const products = await Product.countDocuments({ [oldPath]: { $exists: true } });
        const definition = await Attribute.findOne({ key: oldKey }).lean();
        const targetDefinition = await Attribute.findOne({ key: newKey }).lean();
        if (targetDefinition) throw new Error(`An attribute definition "${newKey}" already exists.`);
        console.log(`${oldKey} -> ${newKey} ("${label}"): ${products} product(s), definition ${definition ? 'found' : 'not found'}`);

        if (apply) {
            await Product.updateMany({ [oldPath]: { $exists: true } }, { $rename: { [oldPath]: newPath } });
            await Attribute.updateOne({ key: oldKey }, { $set: { key: newKey, name: label } });
            await FilterSuggestion.updateMany({ [oldPath]: { $exists: true } }, { $unset: { [oldPath]: '' } });
        }
    } else {
        const [field, from, to] = params;
        if (!field || !from || !to) throw new Error('merge-value needs <field> "<from>" "<to>"');
        if (!(MERGEABLE_FIELDS as readonly string[]).includes(field)) throw new Error(`field must be one of: ${MERGEABLE_FIELDS.join(', ')}`);
        const count = await Product.countDocuments({ [field]: from });
        const existing = await Product.countDocuments({ [field]: to });
        console.log(`${field}: "${from}" (${count} product(s)) -> "${to}" (${existing} already use it)`);
        if (apply) await Product.updateMany({ [field]: from }, { $set: { [field]: to } });
    }

    if (apply) {
        await rebuildFiltersFromAllProducts();
        console.log('Done. Filter suggestions rebuilt.');
    }
    await mongoose.disconnect();
};

run().catch(err => { console.error(err.message); process.exit(1); });
