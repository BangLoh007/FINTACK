"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const prisma_1 = require("./lib/prisma");
const server = app_1.default.listen(env_1.env.port, () => {
    console.log(`FinTrack API is listening on port ${env_1.env.port}`);
});
server.on('error', (error) => {
    console.error('Failed to start FinTrack API:', error.message, error.stack);
    process.exitCode = 1;
});
let isShuttingDown = false;
process.on('SIGTERM', () => {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    console.log('SIGTERM received; shutting down FinTrack API.');
    server.close((error) => {
        if (error) {
            console.error('HTTP server shutdown failed:', error.message, error.stack);
            process.exitCode = 1;
        }
        void Promise.allSettled([prisma_1.prisma.$disconnect(), prisma_1.pool.end()]).then((results) => {
            for (const result of results) {
                if (result.status === 'rejected') {
                    console.error('Resource shutdown failed:', result.reason);
                    process.exitCode = 1;
                }
            }
        });
    });
});
