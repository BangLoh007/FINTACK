"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
const profileSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(100),
    email: zod_1.z.string().trim().email().transform((email) => email.toLowerCase()),
});
const passwordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1).max(72),
    newPassword: zod_1.z
        .string()
        .min(8)
        .max(72)
        .refine((password) => Buffer.byteLength(password, 'utf8') <= 72),
});
function isPrismaErrorCode(error, code) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
router.get('/me', async (request, response, next) => {
    if (!request.userId)
        return response.status(401).json({ message: 'Authentication required.' });
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: request.userId },
            select: { id: true, name: true, email: true, createdAt: true },
        });
        if (!user)
            return response.status(401).json({ message: 'Authentication required.' });
        return response.json({ user });
    }
    catch (error) {
        return next(error);
    }
});
router.put('/me', async (request, response, next) => {
    if (!request.userId)
        return response.status(401).json({ message: 'Authentication required.' });
    const parsedBody = profileSchema.safeParse(request.body);
    if (!parsedBody.success) {
        return response.status(400).json({ message: 'Provide a name and a valid email address.' });
    }
    try {
        const user = await prisma_1.prisma.user.update({
            where: { id: request.userId },
            data: parsedBody.data,
            select: { id: true, name: true, email: true, createdAt: true },
        });
        return response.json({ user });
    }
    catch (error) {
        if (isPrismaErrorCode(error, 'P2002')) {
            return response.status(409).json({ message: 'An account with this email already exists.' });
        }
        if (isPrismaErrorCode(error, 'P2025')) {
            return response.status(401).json({ message: 'Authentication required.' });
        }
        return next(error);
    }
});
router.put('/me/password', async (request, response, next) => {
    if (!request.userId)
        return response.status(401).json({ message: 'Authentication required.' });
    const parsedBody = passwordSchema.safeParse(request.body);
    if (!parsedBody.success) {
        return response.status(400).json({ message: 'Provide the current password and a new password of at least 8 characters.' });
    }
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: request.userId },
            select: { id: true, passwordHash: true },
        });
        if (!user)
            return response.status(401).json({ message: 'Authentication required.' });
        const currentPasswordMatches = await bcrypt_1.default.compare(parsedBody.data.currentPassword, user.passwordHash);
        if (!currentPasswordMatches) {
            return response.status(401).json({ message: 'Current password is incorrect.' });
        }
        const passwordHash = await bcrypt_1.default.hash(parsedBody.data.newPassword, 12);
        await prisma_1.prisma.user.update({
            where: { id: request.userId },
            data: { passwordHash },
            select: { id: true },
        });
        return response.status(204).end();
    }
    catch (error) {
        if (isPrismaErrorCode(error, 'P2025')) {
            return response.status(401).json({ message: 'Authentication required.' });
        }
        return next(error);
    }
});
exports.default = router;
