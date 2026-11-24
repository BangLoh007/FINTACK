# 💰 FinTrack — Personal Finance Tracker

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM 7](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)

A modern, responsive, full-stack Personal Finance Web Application built for high security, precision financial tracking, and intuitive user experience.

> 📖 **Read this in:** **English** | [ภาษาไทย](#-ภาษาไทย)

---

<details open>
<summary><b>🇬🇧 English Version</b></summary>

## 🌟 Key Features

- **🔐 Robust Authentication & Security**:
  - Secure authentication with `bcrypt` (12 rounds) and `JWT` delivered via **HttpOnly cookies** (preventing XSS access).
  - Server-side input validation on every route using **Zod**.
  - Security hardening via **Helmet**, **CORS**, and granular **Rate Limiting** (anti brute-force).
  - Financial amounts are strictly stored as PostgreSQL `Decimal` types to eliminate floating-point rounding errors.
- **💸 Transaction Management**:
  - Record, categorize, and delete income and expense transactions.
  - Multi-parameter **Search & Filtering** (search by keyword, filter by income/expense, or by category).
  - Server-side **Pagination** for optimal performance.
  - One-click **Export to CSV** (encoded with UTF-8 BOM for Microsoft Excel compatibility).
- **📊 Budgeting & Spending Warnings**:
  - Monthly category budgeting with automatic tracking of actual spending.
  - **Dynamic Spending Warnings**:
    - 🟢 **Normal (< 80%)**: Safe spending progress.
    - 🟠 **Near Limit (80% - 99%)**: Proactive warning before exceeding budget.
    - 🔴 **Exceeded (>= 100%)**: Critical alert showing the exact amount over budget.
- **📈 Visual Analytics & Reports**:
  - Interactive charts powered by **Recharts** (Income vs. Expense bar & pie charts).
  - **Category Spending Breakdown** donut chart with color palettes and percentage distribution.
- **🎨 UI / UX Excellence**:
  - Dark Mode and Light Mode support with smooth transitions.
  - Multi-language support (English and Thai via `i18next`).
  - Fluid micro-animations and 3D tilt effects with **Framer Motion**.

## 🗄️ Database Architecture & ER Diagram

```mermaid
erDiagram
    USER ||--o{ TRANSACTION : "owns"
    USER ||--o{ BUDGET : "sets"

    USER {
        uuid id PK
        string email UK
        string passwordHash
        string name
        datetime createdAt
    }

    TRANSACTION {
        string id PK
        uuid userId FK
        string description
        decimal amount
        enum type "INCOME | EXPENSE"
        enum category "FOOD | TRANSPORT | HOUSING | UTILITIES | HEALTH | EDUCATION | ENTERTAINMENT | SHOPPING | OTHER"
        datetime date
    }

    BUDGET {
        uuid id PK
        uuid userId FK
        enum category "FOOD | TRANSPORT | HOUSING | UTILITIES | HEALTH | EDUCATION | ENTERTAINMENT | SHOPPING | OTHER"
        decimal amount
        int month
        int year
    }
