const express = require("express");
const Booking = require("./model");
const { requireRole } = require("./middleware/user");
const { checkVehicle } = require("./vehicles");

const router = express.Router();

const STATUSES = Booking.schema.path("status").enumValues;
const ALLOWED = { customer: ["cancelled"], manager: ["approved", "rejected"] };

const fail = (res, status, code, message) =>
  res.status(status).json({ error: { code, message } });

// Fetches the booking and enforces the ownership rule; returns null after
// sending the 404 or 403 itself.
async function findAccessible(req, res) {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    fail(res, 404, "NOT_FOUND", "No such record");
    return null;
  }
  if (req.user.role === "customer" && String(booking.customerId) !== req.user.id) {
    fail(res, 403, "FORBIDDEN", "This booking isn't yours");
    return null;
  }
  return booking;
}

router.post("/api/bookings", requireRole("customer"), async (req, res) => {
  const { vehicleId, serviceRequested, preferredDate, note } = req.body || {};
  if (typeof vehicleId !== "string" || !/^[0-9a-fA-F]{24}$/.test(vehicleId)) {
    return fail(res, 400, "VALIDATION_ERROR", "vehicleId is required and must be a valid id");
  }

  const booking = new Booking({
    customerId: req.user.id,
    vehicleId,
    serviceRequested,
    preferredDate,
    note,
  });
  await booking.validate();

  const result = await checkVehicle(vehicleId, req.headers.authorization);
  if (result === "not_owned") {
    return fail(res, 400, "VEHICLE_NOT_OWNED", "You can only book your own vehicles");
  }
  if (result === "unavailable") {
    return fail(res, 502, "UPSTREAM_UNAVAILABLE", "Vehicles service is unavailable");
  }

  await booking.save();
  res.status(201).json(booking);
});

router.get("/api/bookings", requireRole("customer", "manager"), async (req, res) => {
  const filter = {};
  if (req.user.role === "customer") filter.customerId = req.user.id;
  else if (req.query.status) filter.status = String(req.query.status);
  res.json(await Booking.find(filter).sort({ createdAt: -1 }));
});

router.get("/api/bookings/:id", requireRole("customer", "manager"), async (req, res) => {
  const booking = await findAccessible(req, res);
  if (booking) res.json(booking);
});

router.patch("/api/bookings/:id/status", requireRole("customer", "manager"), async (req, res) => {
  const { status, managerNote } = req.body || {};
  if (!STATUSES.includes(status)) {
    return fail(res, 400, "VALIDATION_ERROR", `status must be one of: ${STATUSES.join(", ")}`);
  }

  const booking = await findAccessible(req, res);
  if (!booking) return;

  if (!ALLOWED[req.user.role].includes(status)) {
    return fail(res, 403, "FORBIDDEN", `Your role can't set a booking to ${status}`);
  }
  if (booking.status !== "pending") {
    return fail(res, 400, "VALIDATION_ERROR", "Only pending bookings can change status");
  }

  booking.status = status;
  if (req.user.role === "manager" && managerNote !== undefined) booking.managerNote = managerNote;
  await booking.save();
  res.json(booking);
});

router.delete("/api/bookings/:id", requireRole("manager"), async (req, res) => {
  const booking = await Booking.findByIdAndDelete(req.params.id);
  if (!booking) return fail(res, 404, "NOT_FOUND", "No such record");
  res.status(204).end();
});

module.exports = router;
