# Booking: Postman tests

Run these in order. Use the gateway (`{{gateway}}` = `http://localhost:3000`) with `Authorization: Bearer <token>`. POST needs the gateway because Booking calls Vehicles through it.

Setup: two customers (A, B), one manager, one mechanic, each logged in (`customerAToken`, `customerBToken`, `managerToken`, `mechanicToken`). Customer A has a vehicle (`vehicleAId`); Customer B has their own (`vehicleBId`).
Direct testing without the gateway (except POST): hit `http://localhost:3003` with headers `x-user-id: <id>` and `x-user-role: customer|manager|mechanic`.

Dates below must stay in the future; adjust if today passes them.

## Happy path

**1. Customer A creates a booking** (token: customerA)
`POST {{gateway}}/api/bookings`
```json
{
  "vehicleId": "{{vehicleAId}}",
  "serviceRequested": "Oil change",
  "preferredDate": "2030-01-15T02:00:00.000Z",
  "note": "Squeaking when braking",
  "activity": "midterm"
}
```
Expect 201. Body: `_id`, `customerId` (A's id), `vehicleId`, `serviceRequested`, `preferredDate`, `note`, `status: "pending"`, `createdAt`, `updatedAt`. Save `_id` as `bookingId`.

**2. Customer A lists own bookings** (customerA)
`GET {{gateway}}/api/bookings` -> 200, plain array containing the booking.

**3. Manager lists pending** (manager)
`GET {{gateway}}/api/bookings?status=pending` -> 200, plain array including `bookingId`.

**4. Manager reads one** (manager)
`GET {{gateway}}/api/bookings/{{bookingId}}` -> 200, the plain document.

**5. Manager approves** (manager)
`PATCH {{gateway}}/api/bookings/{{bookingId}}/status`
```json
{ "status": "approved", "managerNote": "Bring the car at 9am", "activity": "midterm" }
```
Expect 200, document with `status: "approved"`, `managerNote: "Bring the car at 9am"`.

**6. Customer A cancels a second booking** (customerA): repeat step 1 (save as `bookingId2`), then
`PATCH {{gateway}}/api/bookings/{{bookingId2}}/status`
```json
{ "status": "cancelled", "activity": "midterm" }
```
Expect 200, `status: "cancelled"`.

## Negative tests

Every error body has the shape `{ "error": { "code": "...", "message": "..." } }`.

**N1. Customer B books Customer A's car** (customerB) (PRD test N9)
`POST {{gateway}}/api/bookings`
```json
{ "vehicleId": "{{vehicleAId}}", "serviceRequested": "Oil change", "preferredDate": "2030-01-15T02:00:00.000Z", "activity": "midterm" }
```
Expect 400, `VEHICLE_NOT_OWNED`, "You can only book your own vehicles".

**N2. Past preferredDate** (customerA)
`POST {{gateway}}/api/bookings`, same as step 1 with `"preferredDate": "2020-01-01T00:00:00.000Z"`.
Expect 400, `VALIDATION_ERROR`.

**N3. Missing or invalid vehicleId** (customerA)
`POST {{gateway}}/api/bookings` with `{ "serviceRequested": "Oil change", "preferredDate": "2030-01-15T02:00:00.000Z", "activity": "midterm" }`
Expect 400, `VALIDATION_ERROR` (also with `"vehicleId": "abc"`).

**N4. Customer tries to approve** (customerA, a pending booking)
`PATCH {{gateway}}/api/bookings/{{bookingId3}}/status` with `{ "status": "approved", "activity": "midterm" }`
Expect 403, `FORBIDDEN`. (Create `bookingId3` first with step 1; the gateway lets customers reach this route, the service rejects the value.)

**N5. Status outside the enum** (manager)
`PATCH .../status` with `{ "status": "done", "activity": "midterm" }` -> 400, `VALIDATION_ERROR`.

**N6. Change status of a non-pending booking** (manager)
`PATCH {{gateway}}/api/bookings/{{bookingId}}/status` (approved in step 5) with `{ "status": "rejected", "activity": "midterm" }`
Expect 400, `VALIDATION_ERROR`. Same for customer A on `bookingId2` (already cancelled).

**N7. Customer B reads A's booking** (customerB)
`GET {{gateway}}/api/bookings/{{bookingId}}` -> 403, `FORBIDDEN`.
Customer B cancelling it (`PATCH .../status` with `cancelled`) -> 403 too.

**N8. Customer B's list is filtered** (customerB)
`GET {{gateway}}/api/bookings` -> 200, array that does not contain A's bookings (no error).

**N9. Mechanic is blocked** (mechanic)
`GET {{gateway}}/api/bookings` -> 403, `FORBIDDEN` (the gateway policy, and the service too if hit directly).

**N10. Unknown booking** (manager)
`GET {{gateway}}/api/bookings/000000000000000000000000` -> 404, `NOT_FOUND`.
`GET {{gateway}}/api/bookings/abc` -> 404, `NOT_FOUND`.

**N11. Customer cannot delete** (customerA)
`DELETE {{gateway}}/api/bookings/{{bookingId}}` -> 403, `FORBIDDEN`.

**N12. Vehicles down** (optional): stop the vehicles container, then step 1 -> 502, `UPSTREAM_UNAVAILABLE`.

## Cleanup

**Manager deletes** (manager)
`DELETE {{gateway}}/api/bookings/{{bookingId2}}` -> 204, empty body. A second DELETE -> 404, `NOT_FOUND`.
