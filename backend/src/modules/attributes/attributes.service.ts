import { Attribute } from '../../models/Attribute';

const toKey = (name: string): string =>
    name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

export const getAllAttributesService = async (includeInactive = false) => {
    const query = includeInactive ? {} : { isActive: true };
    return Attribute.find(query).sort({ createdAt: 1 });
};

export const createAttributeService = async (data: { name: string; isActive?: boolean }) => {
    const key = toKey(data.name);
    const existing = await Attribute.findOne({ key });
    if (existing) throw new Error(`An attribute with key "${key}" already exists.`);
    return Attribute.create({ name: data.name.trim(), key, isActive: data.isActive ?? true });
};

export const updateAttributeService = async (id: string, data: { name?: string; isActive?: boolean }) => {
    const attr = await Attribute.findById(id);
    if (!attr) throw new Error('Attribute not found.');

    if (data.name !== undefined) {
        const newKey = toKey(data.name);
        const conflict = await Attribute.findOne({ key: newKey, _id: { $ne: id } });
        if (conflict) throw new Error(`An attribute with key "${newKey}" already exists.`);
        attr.name = data.name.trim();
        attr.key = newKey;
    }
    if (data.isActive !== undefined) attr.isActive = data.isActive;

    await attr.save();
    return attr;
};

export const deleteAttributeService = async (id: string) => {
    const attr = await Attribute.findByIdAndDelete(id);
    if (!attr) throw new Error('Attribute not found.');
    return attr;
};
