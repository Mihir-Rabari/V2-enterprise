import { User } from '../../models/User';
import { hashPassword, comparePassword } from '../../utils/hash';
import { signToken } from '../../utils/jwt';
import { env } from '../../config/env';
import { RegisterInput, LoginInput } from './auth.schema';
import { sendMail } from '../../utils/mailer';
import { forgotPasswordTemplate } from '../../utils/emailTemplates';
import { getFrontendAbsoluteUrl } from '../../utils/url';
import crypto from 'crypto';

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

export const updateMeService = async (userId: string, data: { name?: string; firstName?: string; lastName?: string; phone?: string }) => {
    try {
        const user = await User.findByIdAndUpdate(userId, data, { new: true }).select('-password');
        if (!user) {
            console.warn('[Auth] User not found for update:', userId);
            throw new Error('User not found.');
        }
        const userObj = user.toObject();
        return { ...userObj, id: user._id.toString() };
    } catch (err: any) {
        console.error('[Auth] Error in updateMeService:', err.message);
        throw err;
    }
};

// ── Forgot Password ────────────────────────────────────────────────────────────
export const forgotPasswordService = async (email: string) => {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return success to prevent email enumeration attacks
    if (!user) return { message: 'If an account with that email exists, a reset link has been sent.' };

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Build reset URL using the standardized utility
    const resetUrl = getFrontendAbsoluteUrl(`/reset-password/${rawToken}`);

    const html = forgotPasswordTemplate(user.name, resetUrl);
    await sendMail(user.email, 'Reset Your V2 Password', html);

    return { message: 'If an account with that email exists, a reset link has been sent.' };
};

// ── Reset Password ─────────────────────────────────────────────────────────────
export const resetPasswordService = async (rawToken: string, newPassword: string) => {
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.findOne({
        resetPasswordToken: hashed,
        resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) throw new Error('This password reset link is invalid or has expired.');

    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { message: 'Password reset successfully. You can now log in with your new password.' };
};
