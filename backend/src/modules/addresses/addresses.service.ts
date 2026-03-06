import { User, IAddress } from '../../models/User';
import mongoose from 'mongoose';

export class AddressService {
    static async addAddress(userId: string, addressData: Omit<IAddress, 'isDefault'> & { isDefault?: boolean }) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        // If this is the first address, or specifically set as default
        const isDefault = user.addresses.length === 0 || addressData.isDefault === true;

        if (isDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }

        user.addresses.push({ ...addressData, isDefault } as IAddress);
        await user.save();
        return user.addresses[user.addresses.length - 1];
    }

    static async updateAddress(userId: string, addressId: string, updateData: Partial<IAddress>) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const address = user.addresses.find(a => (a as any)._id.toString() === addressId);
        if (!address) throw new Error('Address not found');

        // Handle default logic if isDefault is being changed to true
        if (updateData.isDefault === true && !address.isDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }

        Object.assign(address, updateData);
        await user.save();
        return address;
    }

    static async removeAddress(userId: string, addressId: string) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const addressIndex = user.addresses.findIndex(a => (a as any)._id.toString() === addressId);
        if (addressIndex === -1) throw new Error('Address not found');

        const wasDefault = user.addresses[addressIndex].isDefault;
        user.addresses.splice(addressIndex, 1);

        // If we removed the default, set another one if available
        if (wasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

        await user.save();
        return { success: true };
    }

    static async setDefaultAddress(userId: string, addressId: string) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        let found = false;
        user.addresses.forEach(addr => {
            if ((addr as any)._id.toString() === addressId) {
                addr.isDefault = true;
                found = true;
            } else {
                addr.isDefault = false;
            }
        });

        if (!found) throw new Error('Address not found');

        await user.save();
        return user.addresses;
    }
}
