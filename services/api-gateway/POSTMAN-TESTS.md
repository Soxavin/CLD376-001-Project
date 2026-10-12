# Gateway Postman tests

All requests go through the gateway at `http://localhost:3000` (use `{{gateway}}` in the real collection). Tokens come from `POST /api/auth/login` (Login service must be running) and are saved as `customerToken`, `mechanicToken`, `managerToken`. Send tokens as `Authorization: Bearer {{customerToken}}`.

## N2: No token

`GET http://localhost:3000/api/bookings` with no Authorization header.

Expected: **401**
```json
{ "error": { "code": "NO_TOKEN", "message": "Send an Authorization: Bearer <token> header" } }
```

## N3: Invalid token (one character changed)

`GET http://localhost:3000/api/auth/me` with `Authorization: Bearer <customer token with the last character changed>`.

Expected: **401**
```json
{ "error": { "code": "INVALID_TOKEN", "message": "Token is invalid or expired" } }
```

## N4: Customer token on a manager route

`POST http://localhost:3000/api/catalog` with `Authorization: Bearer {{customerToken}}`, body:
```json
{ "name": "Test service", "priceCents": 1000, "activity": "midterm" }
```

Expected: **403**
```json
{ "error": { "code": "FORBIDDEN", "message": "Your role can't do this" } }
```

## N5: Mechanic token on billing

`POST http://localhost:3000/api/invoices` with `Authorization: Bearer {{mechanicToken}}`, body:
```json
{ "workOrderId": "000000000000000000000000", "lineItems": [], "activity": "midterm" }
```

Expected: **403**, same body as N4. The gateway rejects it before Billing sees it.

## Round-robin demo

Send `GET http://localhost:3000/api/catalog/health` four times, no Authorization header (the route is public).

Expected: **200** each time, `instance` alternating:

| Request | Body |
| --- | --- |
| 1 | `{ "service": "catalog", "instance": "catalog-a", "status": "ok" }` |
| 2 | `{ "service": "catalog", "instance": "catalog-b", "status": "ok" }` |
| 3 | `{ "service": "catalog", "instance": "catalog-a", "status": "ok" }` |
| 4 | `{ "service": "catalog", "instance": "catalog-b", "status": "ok" }` |

If the gateway has been restarted or other catalog calls were made first, the sequence may start on `catalog-b`; it still alternates.

## Extra checks (optional)

- Fake identity: `GET /api/auth/me` with a customer token and header `x-user-role: manager`. The gateway overwrites it, so Login sees `customer`.
- Unlisted route: `GET /api/anything-else` with a valid token returns **403** `FORBIDDEN` (deny by default).
- A service is down: the matching route returns **502** `UPSTREAM_UNAVAILABLE`.
