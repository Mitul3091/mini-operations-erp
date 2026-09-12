# Testing Checklist

Use the existing Hoppscotch setup and the current seeded database.

## Authentication / RBAC

### Admin login

`POST /auth/login`

Expected: `200` with JWT.

### Public Admin registration blocked

`POST /auth/register`

```json
{
  "name": "Fake Admin",
  "email": "fakeadmin@erp.com",
  "password": "Test@123",
  "role": "ADMIN"
}
```

Expected: `400 Validation failed`.

### Unauthorized inventory creation

Login as Sales User and call `POST /inventory`.

Expected: `403` with a permission-denied message.

## Inventory

### Over-issue

`POST /inventory/transactions` with an `OUT` quantity greater than available.

Expected: `400`, stock unchanged.

### Duplicate transaction

Send the same `transactionKey` twice.

Expected: second request rejected.

## Work Orders

Create a work order with required quantity greater than current available quantity.

Expected response includes a positive `shortage`.

Update status:

```text
ASSIGNED → IN_PROGRESS → COMPLETED
```

## Transfers

Create:

```text
REQUESTED
```

Dispatch:

```text
DISPATCHED
```

Verify source physical stock decreases and destination physical stock is unchanged.

Receive:

```text
RECEIVED
```

Verify destination physical stock increases.

Attempt a second receive.

Expected: rejected.

Attempt a transfer larger than source available stock.

Expected: rejected.

## Customer Reservation

Create an order where requested quantity is greater than available quantity.

Expected: `400 Insufficient available stock for reservation` and no order is created.

For the demonstrated concurrency scenario, reserve the remaining available quantity with one order and attempt the same quantity with another order. The second attempt must not increase reserved stock beyond physical quantity.

Example final state after the successful reservation:

```text
Physical = 20
Reserved = 20
Available = 0
```

## Frontend

Check each role:

### ADMIN

- Dashboard
- Inventory
- Work Orders
- Internal Transfers
- Customer Orders

### OPERATIONS_USER

- Dashboard
- Inventory
- Work Orders
- Internal Transfers

### SALES_USER

- Dashboard
- Inventory
- Customer Orders

The backend must still reject unauthorized direct API calls even when a user manually enters an endpoint.
