"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.pool = void 0;
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const env_1 = require("../config/env");
exports.pool = new pg_1.Pool({ connectionString: env_1.env.databaseUrl });
exports.pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message, error.stack);
});
const adapter = new adapter_pg_1.PrismaPg(exports.pool);
exports.prisma = new client_1.PrismaClient({ adapter });
