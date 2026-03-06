import mongoose, { Schema, Document } from 'mongoose';

export interface IAddress {
    label: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    isDefault: boolean;
}

export interface IUser extends Document {
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    password: string;
    phone?: string;
    role: 'CUSTOMER' | 'ADMIN';
    addresses: IAddress[];
    wishlist: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>({
    label: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
});

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        firstName: { type: String },
        lastName: { type: String },
        email: { type: String, required: true, unique: true, index: true },
        password: { type: String, required: true },
        phone: { type: String },
        role: { type: String, enum: ['CUSTOMER', 'ADMIN'], default: 'CUSTOMER' },
        addresses: [AddressSchema],
        wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    },
    { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
