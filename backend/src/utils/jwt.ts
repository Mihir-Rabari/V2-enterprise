import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface JWTPayload {
    userId: string;
    role: 'CUSTOMER' | 'ADMIN';
}

export const signToken = (payload: JWTPayload): string => {
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
};

export const verifyToken = (token: string): JWTPayload => {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
};
