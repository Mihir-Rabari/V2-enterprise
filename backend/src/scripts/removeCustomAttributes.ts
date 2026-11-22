/**
 * One-off clean-up: remove junk custom attribute keys everywhere they live.
 *
 *   node dist/scripts/removeCustomAttributes.js witdth brightness            (dry run: only counts)
 *   node dist/scripts/removeCustomAttributes.js witdth brightness --apply    (does it)
 *
 * For each key it:
 *   1. $unsets customAttributes.<key> on every product,
 *   2. removes the key from the filter-suggestions document (the shop sidebar reads it),
 *   3. deletes the attribute definition (admin "Attributes" page) if one exists.
 * Nothing else is touched. Keys are matched exactly (lower-case, as stored).
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../models/Product';
import { FilterSuggestion } from '../models/FilterSuggestion';
import { Attribute } from '../models/Attribute';

dotenv.config();

const run = async () => {
    const args = process.argv.slice(2);
    const apply = args.includes('--apply');
    const keys = [...new Set(args.filter(a => !a.startsWith('--')).map(k => k.trim()).filter(Boolean))];
    if (keys.length === 0) throw new Error('Pass at least one attribute key, e.g. witdth brightness');
    if (keys.some(k => !/^[a-z0-9_]+$/i.test(k))) throw new Error('Keys may only contain letters, digits and underscores.');
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log(apply ? 'APPLYING changes' : 'DRY RUN (add --apply to change anything)');

    for (const key of keys) {
        const path = `customAttributes.${key}`;
        const products = await Product.countDocuments({ [path]: { $exists: true } });
        const suggestion = await FilterSuggestion.countDocuments({ [path]: { $exists: true } });
        const definitions = await Attribute.countDocuments({ key: key.toLowerCase() });
        console.log(`${key}: ${products} product(s), ${suggestion} filter-suggestion doc(s), ${definitions} attribute definition(s)`);
        if (!apply) continue;
        await Product.updateMany({ [path]: { $exists: true } }, { $unset: { [path]: '' } });
        await FilterSuggestion.updateMany({ [path]: { $exists: true } }, { $unset: { [path]: '' } });
        await Attribute.deleteMany({ key: key.toLowerCase() });
        console.log(`  removed ${key}`);
    }
    await mongoose.disconnect();
};

run().catch(err => { console.error(err.message); process.exit(1); });
