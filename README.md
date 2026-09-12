# Mini Operations ERP

A production-oriented full-stack Operations ERP demonstrating inventory control, work orders, internal stock transfers, customer orders, stock reservation, authentication, role-based authorization, validation, relational data modeling, and transactional business logic.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL (Neon)
- ORM: Prisma
- Authentication: JWT
- Validation: Zod
- HTTP client: Axios

## Business Flow

Inventory → Work Order → Stock Check → Internal Transfer / Shortage → Customer Reservation

## Roles

- ADMIN: administrative and operational control
- OPERATIONS_USER: inventory operations, work orders, and internal transfers
- SALES_USER: customer orders and stock reservation

Backend authorization is the source of truth for permissions; frontend role visibility is only a usability layer.

## Project Structure

```text
mini-operations-erp/
├── backend/
│   ├── prisma/
│   ├── scripts/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── utils/
│       └── validators/
└── frontend/
    └── src/
        ├── components/
        ├── context/
        ├── pages/
        └── services/
```

## Environment

Backend `.env`:

```env
PORT=5000
JWT_SECRET=your_strong_jwt_secret
DATABASE_URL=your_neon_postgresql_connection_string
```

Do not commit `.env`. Keep secrets out of source control.

## Setup

### Backend

```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run typecheck
npm run dev
```

Backend runs at:

```text
http://localhost:5000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## Core API Endpoints

### Authentication

- `POST /auth/register`
- `POST /auth/login`

Public registration accepts only `OPERATIONS_USER` or `SALES_USER`; Admin creation is not exposed through public registration.

### Inventory

- `GET /inventory`
- `POST /inventory`
- `POST /inventory/transactions`

### Master Data

- `GET /master-data/categories`
- `POST /master-data/categories`
- `GET /master-data/locations`
- `POST /master-data/locations`
- `GET /master-data/items`
- `POST /master-data/items`
- `GET /master-data/batches`
- `POST /master-data/batches`

### Work Orders

- `GET /work-orders`
- `POST /work-orders`
- `PATCH /work-orders/:id/status`

### Internal Transfers

- `GET /transfers`
- `POST /transfers`
- `PATCH /transfers/:id/status`

Transfer lifecycle:

```text
REQUESTED → DISPATCHED → RECEIVED
```

Dispatch decreases source stock. Destination stock changes only on receipt. Duplicate receipt is rejected.

### Customers

- `GET /customers`
- `POST /customers`

### Customer Orders

- `GET /orders`
- `POST /orders`
- `PATCH /orders/:id/status`

Reservation is performed inside a database transaction with a guarded inventory update so concurrent requests cannot reserve more stock than is available.

## Business Rules Implemented

- Inventory cannot go below zero.
- Reserved quantity cannot exceed physical quantity.
- Duplicate inventory transaction keys are rejected.
- Duplicate order and transfer numbers are rejected.
- Work-order shortages are calculated automatically.
- Transfers cannot use the same source and destination.
- Transfer dispatch requires sufficient available source stock.
- Destination stock does not increase on dispatch.
- Destination stock increases on receipt.
- Duplicate receipt is rejected.
- Customer reservation cannot exceed available stock.
- Backend RBAC blocks unauthorized operations.
- Public registration cannot create an Admin account.

## Required Test Cases

1. Over-reservation: request more stock than available.
2. Inventory negative-stock protection: issue more than available stock.
3. Duplicate inventory transaction.
4. Over-transfer.
5. Destination unchanged after dispatch.
6. Destination increases after receipt.
7. Duplicate transfer receipt.
8. Unauthorized restricted operation.
9. Duplicate order number.
10. Concurrent reservation attempts against the same available stock.

## Example Verified Data State

After the demonstrated transfer and reservations:

```text
Production Unit
Physical: 20
Reserved: 20
Available: 0

Main Warehouse
Physical: 35
Reserved: 0
Available: 35
```

## Documentation

- `swagger.yaml` — OpenAPI API documentation
- `postman_collection.json` — Postman API collection
- `ERD.md` — Mermaid entity relationship diagram
- `TESTING.md` — test plan and expected outcomes

## Git History

Use multiple meaningful commits instead of one final dump. Suggested history:

```text
git add .
git commit -m "Initialize ERP project and backend"
git commit -m "Add Prisma schema and database migration"
git commit -m "Add authentication and role authorization"
git commit -m "Implement inventory management"
git commit -m "Implement work orders"
git commit -m "Implement internal stock transfers"
git commit -m "Implement customer orders and stock reservation"
git commit -m "Build ERP frontend screens"
git commit -m "Add role-based frontend navigation"
git commit -m "Add API documentation and final project docs"
```

Only use commit messages for changes that actually exist in your history. Do not manufacture a development history.

## Demo Flow

For the 5–7 minute demonstration:

1. Login as Admin.
2. Show Inventory and available stock.
3. Show a Work Order and automatic shortage.
4. Create or show an Internal Transfer.
5. Dispatch it and show source/destination behavior.
6. Receive it and show destination stock increasing.
7. Login as Sales User.
8. Create a Customer Order and show stock reservation.
9. Demonstrate over-reservation rejection.
10. Show role-based access denial.

## Security Notes

- Keep `DATABASE_URL` and `JWT_SECRET` in environment variables.
- Never commit secrets.
- Backend middleware enforces authorization regardless of frontend visibility.
- Passwords are stored as bcrypt hashes.
