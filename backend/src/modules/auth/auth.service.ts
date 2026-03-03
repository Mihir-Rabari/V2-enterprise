import { User } from '../../models/User';
import { hashPassword, comparePassword } from '../../utils/hash';
import { signToken } from '../../utils/jwt';
import { env } from '../../config/env';
import { RegisterInput, LoginInput } from './auth.schema';

export const registerService = async (input: RegisterInput) => {
    const existing = await User.findOne({ email: input.email });
    if (existing) throw new Error('An account with this email already exists.');

    const hashed = await hashPassword(input.password);
    const role = input.adminCode === env.ADMIN_SECRET_CODE ? 'ADMIN' : 'CUSTOMER';

    const user = await User.create({
        name: input.name,
        email: input.email,
        password: hashed,
        phone: input.phone,
        role,
    });

    const token = signToken({ userId: user._id.toString(), role: user.role });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user.toObject();
    return { user: { ...safeUser, id: user._id.toString() }, token };
};

export const loginService = async (input: LoginInput) => {
    const user = await User.findOne({ email: input.email });
    if (!user) throw new Error('Invalid email or password.');

    const valid = await comparePassword(input.password, user.password);
    if (!valid) throw new Error('Invalid email or password.');

    const token = signToken({ userId: user._id.toString(), role: user.role });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...safeUser } = user.toObject();
    return { user: { ...safeUser, id: user._id.toString() }, token };
};

export const getMeService = async (userId: string) => {
    const user = await User.findById(userId).select('-password');
    if (!user) throw new Error('User not found.');

    const userObj = user.toObject();
    return { ...userObj, id: user._id.toString() };
};

export const updateMeService = async (userId: string, data: { name?: string; phone?: string }) => {
    const user = await User.findByIdAndUpdate(userId, data, { new: true }).select('-password');
    if (!user) throw new Error('User not found.');

    const userObj = user.toObject();
    return { ...userObj, id: user._id.toString() };
};
