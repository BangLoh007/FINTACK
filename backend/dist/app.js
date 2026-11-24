"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = require("express-rate-limit");
const env_1 = require("./config/env");
const auth_1 = __importDefault(require("./routes/auth"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const budgets_1 = __importDefault(require("./routes/budgets"));
const users_1 = __importDefault(require("./routes/users"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: env_1.env.frontendOrigin, credentials: true }));
app.use((0, helmet_1.default)());
app.use('/api', (0, express_rate_limit_1.rateLimit)({ windowMs: 15 * 60 * 1000, limit: 100 }));
app.use(express_1.default.json({ limit: '10kb' }));
app.use((0, cookie_parser_1.default)());
app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', message: 'FinTrack API is running' });
});
app.use('/api/auth', auth_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/budgets', budgets_1.default);
app.use('/api/users', users_1.default);
app.use((error, _request, response, _next) => {
    if (typeof error === 'object' && error !== null &&
        'type' in error && error.type === 'entity.parse.failed') {
        return response.status(400).json({ message: 'Request body contains malformed JSON.' });
    }
    console.error('API request failed:', error instanceof Error ? error.message : String(error), error instanceof Error ? error.stack : undefined);
    return response.status(500).json({ message: 'An internal server error occurred.' });
});
exports.default = app;
