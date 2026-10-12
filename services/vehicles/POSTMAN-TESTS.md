# Vehicles: Postman test plan

Run these in order. Every JSON body carries `"activity": "midterm"` (the PRD submission label; Mongoose drops it).

## Setup

Start the service with a real Atlas URI (`.env` from `.env.example`), then `npm run dev` in `services/vehicles` (port 3004).

Environment variables to create in Postman:

| Variable | Value |
| --- | --- |
| `vehicles` | `http://localhost:3004` (direct) |
| `gateway` | `http://localhost:3000` (Part B) |
| `custA` / `custB` | two different 24-hex user ids, e.g. `66f1c2a9e4b0a1b2c3d4e5f6` and `66f1c2a9e4b0a1b2c3d4e5f7` |
| `mechId` / `mgrId` | any other 24-hex ids |
| `vehicleId` | saved by request 1 |

## Part A: direct to port 3004 (fake identity headers)

Every request sets two headers: `x-user-id` and `x-user-role`. Error bodies always have the shape
`{ "error": { "code": "...", "message": "..." } }`.

### Happy path

**1. Customer A creates a car**
`POST {{vehicles}}/api/vehicles` with `x-user-id: {{custA}}`, `x-user-role: customer`

```json
{
  "plateNumber": " 2a-1234 ",
  "make": "Toyota",
  "model": "Camry",
  "year": 2020,
  "color": "white",
  "ownerId": "66f1c2a9e4b0a1b2c3d4e5f7",
  "activity": "midterm"
}
```

Expect **201**, a car object with `_id`, `ownerId` equal to `{{custA}}` (the body `ownerId` is ignored), `plateNumber` `"2A-1234"` (trimmed and uppercased), `createdAt`, `updatedAt`.
Post-response script: `pm.environment.set("vehicleId", pm.response.json()._id);`

**2. Customer A lists cars**
`GET {{vehicles}}/api/vehicles` as customer A. Expect **200**, a plain array containing only A's cars (request 1's car).

**3. Customer B lists cars**
`GET {{vehicles}}/api/vehicles` as customer B. Expect **200** and `[]` (silently filtered, not 403).

**4. Mechanic lists all**
`GET {{vehicles}}/api/vehicles` with `x-user-id: {{mechId}}`, `x-user-role: mechanic`. Expect **200**, array including A's car.

**5. Customer A reads own car**
`GET {{vehicles}}/api/vehicles/{{vehicleId}}` as customer A. Expect **200**, the car object (this is the call Booking relies on).

**6. Mechanic reads the car**
Same URL as mechanic. Expect **200**, same object.

**7. Customer A updates own car**
`PUT {{vehicles}}/api/vehicles/{{vehicleId}}` as customer A

```json
{ "color": "red", "year": 2021, "activity": "midterm" }
```

Expect **200**, the full updated car with `color: "red"`, `year: 2021`, new `updatedAt`.

**8. ownerId in PUT body is ignored**
`PUT {{vehicles}}/api/vehicles/{{vehicleId}}` as customer A

```json
{ "ownerId": "66f1c2a9e4b0a1b2c3d4e5f7", "color": "blue", "activity": "midterm" }
```

Expect **200**, `color: "blue"` and `ownerId` still `{{custA}}`.

**9. Manager updates any car**
`PUT {{vehicles}}/api/vehicles/{{vehicleId}}` with `x-user-id: {{mgrId}}`, `x-user-role: manager`

```json
{ "color": "black", "activity": "midterm" }
```

Expect **200**, `color: "black"`, `ownerId` unchanged (still `{{custA}}`).

### Negative tests

| # | Request | Headers | Body | Expect |
| --- | --- | --- | --- | --- |
| 10 | `POST /api/vehicles` | mechanic | valid car, plate `"9Z-0001"` | **403** `FORBIDDEN` ("Your role can't do this") |
| 11 | `POST /api/vehicles` | customer B | request 1's body (same plate) | **409** `DUPLICATE` |
| 11b | `POST /api/vehicles` | customer B | request 1's body with plate `"2a-1234"` lowercase | **409** `DUPLICATE` (uppercase normalisation) |
| 12 | `POST /api/vehicles` | customer A | `{ "plateNumber": "3B-0002", "model": "Camry", "activity": "midterm" }` (no `make`) | **400** `VALIDATION_ERROR` |
| 13 | `POST /api/vehicles` | customer A | `{ "plateNumber": "3B-0003", "make": "Honda", "model": "Civic", "year": 1970, "activity": "midterm" }` | **400** `VALIDATION_ERROR` (year min 1980) |
| 14 | `GET /api/vehicles/{{vehicleId}}` | customer B | none | **403** `FORBIDDEN` ("That vehicle isn't yours") |
| 15 | `PUT /api/vehicles/{{vehicleId}}` | customer B | `{ "color": "green", "activity": "midterm" }` | **403** `FORBIDDEN` |
| 16 | `PUT /api/vehicles/{{vehicleId}}` | mechanic | `{ "color": "green", "activity": "midterm" }` | **403** `FORBIDDEN` (role) |
| 17 | `DELETE /api/vehicles/{{vehicleId}}` | customer B | none | **403** `FORBIDDEN` |
| 18 | `DELETE /api/vehicles/{{vehicleId}}` | mechanic | none | **403** `FORBIDDEN` (role) |
| 19 | `GET /api/vehicles/not-an-id` | customer A | none | **404** `NOT_FOUND` |
| 20 | `GET /api/vehicles/66f1c2a9e4b0a1b2c3d4e5ff` (valid format, no such car) | customer A | none | **404** `NOT_FOUND` |
| 21 | `PUT /api/vehicles/66f1c2a9e4b0a1b2c3d4e5ff` | manager | `{ "color": "red", "activity": "midterm" }` | **404** `NOT_FOUND` |
| 22 | `PUT /api/vehicles/{{vehicleId}}` | customer A | `{ "year": 1900, "activity": "midterm" }` | **400** `VALIDATION_ERROR` (validators run on update) |
| 23 | `PUT /api/vehicles/{{vehicleId}}` | customer A | `{ "make": "", "activity": "midterm" }` | **400** `VALIDATION_ERROR` |

For 14 to 18, confirm afterwards (request 5 as customer A) that the car is unchanged and still exists.

### Cleanup

**24. Customer A deletes own car**
`DELETE {{vehicles}}/api/vehicles/{{vehicleId}}` as customer A. Expect **204**, empty body.

**25. Deleted car is gone**
`GET {{vehicles}}/api/vehicles/{{vehicleId}}` as customer A. Expect **404** `NOT_FOUND`.

**26. Manager deletes any car**
Re-run request 1 to get a new `vehicleId`, then `DELETE` it as manager. Expect **204**.

## Part B: through the gateway (port 3000, Bearer tokens)

Log in first (Login service) to save `customerToken` (customer A), `customer2Token` (customer B), `mechanicToken`, `managerToken`. Do not send `x-user-*` headers; the gateway sets them from the token. Use `Authorization: Bearer {{customerToken}}` etc., and replace `{{vehicles}}` with `{{gateway}}`.

Repeat requests 1 to 26 with the same expectations, using:

- customer A = `customerToken`, customer B = `customer2Token`, mechanic = `mechanicToken`, manager = `managerToken`.
- `ownerId` in request 1 is the real customer A user id from the token's `sub`.

Extra gateway-only checks:

| # | Request | Expect |
| --- | --- | --- |
| G1 | `GET {{gateway}}/api/vehicles` with no `Authorization` header | **401** `NO_TOKEN` |
| G2 | `GET {{gateway}}/api/vehicles` with `Bearer garbage` | **401** `INVALID_TOKEN` |
| G3 | `POST {{gateway}}/api/vehicles` as mechanic or manager | **403** `FORBIDDEN` (rejected by the gateway policy) |
| G4 | `POST {{gateway}}/api/vehicles` as customer A with extra headers `x-user-id: {{custB}}` and `x-user-role: manager` | **201**, `ownerId` is still customer A (the gateway strips forged headers) |
