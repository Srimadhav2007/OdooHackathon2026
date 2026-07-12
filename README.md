# AssetFlow — Enterprise Asset & Resource Management System

> ERP platform for tracking physical assets and shared resources across any organization.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite) + Tailwind CSS |
| Backend | Node.js + Express 5 |
| ORM | Prisma |
| Database | PostgreSQL 16 (local) |
| Auth | JWT + bcrypt |
| Real-time | Socket.io |

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16 running locally

### Backend
```bash
cd backend
npm install
cp .env.example .env        # fill in DATABASE_URL and JWT_SECRET
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

App runs at: http://localhost:5173  
API runs at: http://localhost:4000

---

## Project Structure

```
assetflow/
├── backend/       # Express API + Prisma + Socket.io
└── frontend/      # React + Vite + Tailwind
```

---

## Roles
| Role | Description |
|---|---|
| Admin | Full access: org setup, role promotion, audit cycles |
| Asset Manager | Register/allocate assets, approve maintenance/transfers |
| Department Head | View dept assets, approve dept transfers, book resources |
| Employee | View own assets, raise maintenance, book resources |

> **Note:** Signup always creates an Employee. Only Admin promotes roles from the Employee Directory.

---

## Demo Accounts (after seeding)
| Email | Password | Role |
|---|---|---|
| admin@assetflow.com | Admin@123 | Admin |
| manager@assetflow.com | Manager@123 | Asset Manager |
| head@assetflow.com | Head@123 | Department Head |
| emp@assetflow.com | Emp@123 | Employee |

---

## Git Branches
| Branch | Owner | Scope |
|---|---|---|
| `feature/db-auth-core` | Member A | Schema, migrations, seed, auth APIs, dept/category/employee CRUD |
| `feature/backend-logic` | Member B | Allocation, booking, maintenance, audit, notification APIs |
| `feature/frontend-core` | Member C | Design system, layout shell, Login, Dashboard, Org Setup |
| `feature/frontend-features` | Member D | Allocation UI, Booking calendar, Maintenance, Audit, Reports |
