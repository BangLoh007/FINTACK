# FinTrack - Project Instructions

## Project Overview
Personal Finance Tracker Web Application.
This project is created for internship preparation
and learning full-stack development.

(+) ## Current Status
(+) - Phase 1 (UI) and Phase 2 (basic CRUD) are done.
(+) - Next: JWT authentication and linking Transaction to User.

## Tech Stack
(+) - Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, react-router-dom
(+) - Backend: Node.js, Express, TypeScript
(+) - Database: PostgreSQL (Neon) + Prisma ORM v7 with @prisma/adapter-pg
(+) - When unsure about a library's API, check the official docs for the
(+)   INSTALLED version. Do not guess.

(+) ## Commands
(+) - dev / build / lint / test: <fill in your actual scripts>

## Development Rules
1. Write clean and readable code.
2. Use TypeScript.
3. Follow a clear folder structure.
4. Separate frontend and backend logic.
5. Validate all user inputs.
6. Protect user financial data.
7. Never expose passwords or secrets.
8. Write tests for important business logic.
(+) 9. Tests use Vitest + Supertest. Ask me before installing them.

(+) ## Security Rules (specific)
(+) - Validate all input server-side with Zod.
(+) - userId always comes from the verified JWT, never from request body/query.
(+) - Every transaction query filters by userId; deletes use
(+)   deleteMany({ where: { id, userId } }).
(+) - Money is stored as Decimal, never Float.
(+) - Never store tokens in localStorage.
(+) - Never read, print, or commit .env.

## AI Assistant Rules
1. Explain the purpose of every new feature.
2. Explain important code changes.
3. Do not modify unrelated files.
4. Do not install packages without explaining why.
5. Do not skip error handling.
6. Do not generate the entire project at once.
7. Teach the developer while implementing features.
8. Ask before making major architectural changes.
(+) 9. Before editing any file, show a short plan (files + why) and WAIT for my approval.
(+) 10. Work on one step at a time. When done, tell me how to verify it
(+)     and what you are unsure about.
(+) 11. Reply in Thai; write code, comments, and commit messages in English.

## Learning Goals
The developer is a third-year university student.
Prioritize understanding over generating code quickly.





