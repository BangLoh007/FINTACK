"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTransactionDto = toTransactionDto;
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// Valid lowercase category values derived from the Prisma enum
const categoryValues = Object.values(client_1.Category).map((c) => c.toLowerCase());
const createTransactionSchema = zod_1.z.object({
    description: zod_1.z.string().trim().min(1).max(100),
    amount: zod_1.z.number().positive().max(1_000_000_000),
    type: zod_1.z.enum(['income', 'expense']),
    // category is optional — if omitted the DB default (OTHER) is used
    category: zod_1.z.enum(categoryValues).optional(),
});
const transactionQuerySchema = zod_1.z.object({
    search: zod_1.z.string().trim().optional(),
    type: zod_1.z.enum(['income', 'expense']).optional(),
    category: zod_1.z.enum(categoryValues).optional(),
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
});
function toTransactionDto(transaction) {
    return {
        id: transaction.id,
        date: transaction.date,
        description: transaction.description,
        amount: Number(transaction.amount),
        type: transaction.type.toLowerCase(),
        // Use nullish coalescing in case the column is not yet present in the DB
        // (e.g. before migration runs). After migration this will always be defined.
        category: (transaction.category ?? 'OTHER').toLowerCase(),
    };
}
router.get('/', async (request, response, next) => {
    if (!request.userId)
        return response.status(401).json({ message: 'Authentication required.' });
    const parsedQuery = transactionQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
        return response.status(400).json({ message: 'Invalid query parameters provided.' });
    }
    const { search, type, category, page, limit } = parsedQuery.data;
    const whereClause = {
        userId: request.userId,
    };
    if (search && search.length > 0) {
        whereClause.description = { contains: search, mode: 'insensitive' };
    }
    if (type) {
        whereClause.type = type.toUpperCase();
    }
    if (category) {
        whereClause.category = category.toUpperCase();
    }
    try {
        // If pagination is requested (page is provided)
        if (page !== undefined) {
            const take = limit ?? 10;
            const skip = (page - 1) * take;
            const [totalCount, transactions] = await Promise.all([
                prisma_1.prisma.transaction.count({ where: whereClause }),
                prisma_1.prisma.transaction.findMany({
                    where: whereClause,
                    orderBy: { date: 'desc' },
                    skip,
                    take,
                }),
            ]);
            const totalPages = Math.ceil(totalCount / take);
            return response.json({
                data: transactions.map(toTransactionDto),
                pagination: {
                    page,
                    limit: take,
                    totalCount,
                    totalPages,
                },
            });
        }
        // Default unpaginated query (or limit-only for dashboard/reports)
        const transactions = await prisma_1.prisma.transaction.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            ...(limit !== undefined ? { take: limit } : {}),
        });
        return response.json(transactions.map(toTransactionDto));
    }
    catch (error) {
        return next(error);
    }
});
router.post('/', async (request, response, next) => {
    if (!request.userId)
        return response.status(401).json({ message: 'Authentication required.' });
    const parsedBody = createTransactionSchema.safeParse(request.body);
    if (!parsedBody.success) {
        return response.status(400).json({
            message: 'Provide a description (1 to 100 characters), a positive amount up to 1,000,000,000, and type income or expense.',
        });
    }
    try {
        const transaction = await prisma_1.prisma.transaction.create({
            data: {
                description: parsedBody.data.description,
                amount: parsedBody.data.amount,
                type: parsedBody.data.type.toUpperCase(),
                // If category was provided, store it as uppercase (e.g. "food" -> "FOOD")
                // Otherwise let the DB use the @default(OTHER)
                ...(parsedBody.data.category
                    ? { category: parsedBody.data.category.toUpperCase() }
                    : {}),
                userId: request.userId,
            },
        });
        return response.status(201).json(toTransactionDto(transaction));
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id', async (request, response, next) => {
    if (!request.userId)
        return response.status(401).json({ message: 'Authentication required.' });
    try {
        const result = await prisma_1.prisma.transaction.deleteMany({
            where: { id: request.params.id, userId: request.userId },
        });
        if (result.count === 0)
            return response.status(404).json({ message: 'Transaction not found.' });
        return response.status(204).end();
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
