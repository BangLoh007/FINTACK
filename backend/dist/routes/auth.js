"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_rate_limit_1 = require("express-rate-limit");
const zod_1 = require("zod");
const env_1 = require("../config/env");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
const registerLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: { message: 'Too many registration attempts. Please try again later.' },
});
const loginLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: { message: 'Too many login attempts. Please try again later.' },
});
const credentialsSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email().transform((email) => email.toLowerCase()),
    password: zod_1.z
        .string()
        .min(8)
        .max(72)
        .refine((password) => Buffer.byteLength(password, 'utf8') <= 72),
});
const dummyPasswordHash = bcrypt_1.default.hashSync('FinTrack missing-user password comparison', 12);
const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: env_1.env.nodeEnv === 'production',
    path: '/',
    maxAge: 60 * 60 * 1000,
};
function createToken(userId) {
    return jsonwebtoken_1.default.sign({ sub: userId }, env_1.env.jwtSecret, {
        algorithm: 'HS256',
        expiresIn: '1h',
    });
}
function setAuthCookie(response, token) {
    response.cookie(auth_1.AUTH_COOKIE_NAME, token, cookieOptions);
}
function isUniqueConstraintError(error) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
router.post('/register', registerLimiter, async (request, response, next) => {
    const parsedBody = credentialsSchema.safeParse(request.body);
    if (!parsedBody.success) {
        return response.status(400).json({ message: 'Provide a valid email and a password from 8 to 72 characters.' });
    }
    const { email, password } = parsedBody.data;
    try {
        const passwordHash = await bcrypt_1.default.hash(password, 12);
        const user = await prisma_1.prisma.user.create({
            data: { email, passwordHash },
            select: { id: true, email: true, createdAt: true },
        });
        setAuthCookie(response, createToken(user.id));
        return response.status(201).json({ user });
    }
    catch (error) {
        if (isUniqueConstraintError(error)) {
            return response.status(409).json({ message: 'An account with this email already exists.' });
        }
        return next(error);
    }
});
router.post('/login', loginLimiter, async (request, response, next) => {
    const parsedBody = credentialsSchema.safeParse(request.body);
    if (!parsedBody.success) {
        return response.status(400).json({ message: 'Provide a valid email and a password from 8 to 72 characters.' });
    }
    const { email, password } = parsedBody.data;
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, passwordHash: true, createdAt: true },
        });
        const passwordMatches = await bcrypt_1.default.compare(password, user?.passwordHash ?? dummyPasswordHash);
        if (!user || !passwordMatches) {
            return response.status(401).json({ message: 'Email or password is incorrect.' });
        }
        setAuthCookie(response, createToken(user.id));
        return response.json({
            user: { id: user.id, email: user.email, createdAt: user.createdAt },
        });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/logout', (_request, response) => {
    response.clearCookie(auth_1.AUTH_COOKIE_NAME, {
        httpOnly: cookieOptions.httpOnly,
        sameSite: cookieOptions.sameSite,
        secure: cookieOptions.secure,
        path: cookieOptions.path,
    });
    return response.status(204).end();
});
router.get('/me', auth_1.requireAuth, async (request, response, next) => {
    if (!request.userId)
        return response.status(401).json({ message: 'Authentication required.' });
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: request.userId },
            select: { id: true, email: true, createdAt: true },
        });
        if (!user)
            return response.status(401).json({ message: 'Authentication required.' });
        return response.json({ user });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
