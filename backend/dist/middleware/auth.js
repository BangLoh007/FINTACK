"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.AUTH_COOKIE_NAME = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
exports.AUTH_COOKIE_NAME = 'fintrack_token';
const requireAuth = (request, response, next) => {
    const token = request.cookies?.[exports.AUTH_COOKIE_NAME];
    if (typeof token !== 'string') {
        return response.status(401).json({ message: 'Authentication required.' });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret, { algorithms: ['HS256'] });
        if (typeof payload === 'string' || typeof payload.sub !== 'string') {
            return response.status(401).json({ message: 'Authentication required.' });
        }
        request.userId = payload.sub;
        return next();
    }
    catch {
        return response.status(401).json({ message: 'Authentication required.' });
    }
};
exports.requireAuth = requireAuth;
