const express = require("express");
const mongoose = require("mongoose");
const WorkOrder = require("./model");
const { requireRole } = require("./middleware/user");
const { getBooking } = require("./booking");

const router = express.Router();

const STATUSES = WorkOrder.schema.path("status").enumValues;

const fail = (res, status, code, message) =>
  res.status(status).json({ error: { code, message } });

// Loads a work order and applies the ownership rules: a customer must own it,
// a mechanic must be assigned to it. Managers see everything. Returns null
// after sending the 404 or 403 itself.
async function findAccessible(req, res) {
  const workOrder = await WorkOrder.findById(req.params.id);
  if (!workOrder) {
    fail(res, 404, "NOT_FOUND", "No such work order");
    return null;
  }
  if (req.user.role === "customer" && String(workOrder.customerId) !== req.user.id) {
    fail(res, 403, "FORBIDDEN", "This work order isn't yours");
    return null;
  }
  if (req.user.role === "mechanic" && String(workOrder.mechanicId) !== req.user.id) {
    fail(res, 403, "FORBIDDEN", "This work order isn't assigned to you");
    return null;
  }
  return workOrder;
}

// POST /api/work-orders  (manager). Body: bookingId, mechanicId.
router.post("/api/work-orders", requireRole("manager"), async (req, res) => {
  const { bookingId, mechanicId } = req.body ?? {};
  if (!mongoose.isValidObjectId(bookingId) || !mongoose.isValidObjectId(mechanicId)) {
    return fail(res, 400, "VALIDATION_ERROR", "bookingId and mechanicId are required and must be valid ids");
  }

  const booking = await getBooking(bookingId, req.headers.authorization);
  if (!booking) {
    return fail(res, 502, "UPSTREAM_UNAVAILABLE", "A service this request needs is down or timed out");
  }
  if (booking.status === 404) return fail(res, 404, "NOT_FOUND", "Booking not found");
  if (booking.status !== 200 || !booking.body) {
    return fail(res, 502, "UPSTREAM_UNAVAILABLE", "A service this request needs is down or timed out");
  }
  if (booking.body.status !== "approved") {
    return fail(res, 400, "BOOKING_NOT_APPROVED", "A work order can only be created for an approved booking");
  }

  // customerId, vehicleId and description are copied from the booking, never from the body.
  // A second work order for the same booking is rejected by the unique index (409).
  const workOrder = await WorkOrder.create({
    bookingId,
    customerId: booking.body.customerId,
    vehicleId: booking.body.vehicleId,
    mechanicId,
    description: booking.body.serviceRequested,
  });
  res.status(201).json(workOrder);
});

// GET /api/work-orders  (customer, mechanic, manager). Each role silently sees only its own.
router.get("/api/work-orders", requireRole("customer", "mechanic", "manager"), async (req, res) => {
  const filter = {};
  if (req.user.role === "customer") filter.customerId = req.user.id;
  else if (req.user.role === "mechanic") filter.mechanicId = req.user.id;
  if (typeof req.query.status === "string") filter.status = req.query.status;
  res.json(await WorkOrder.find(filter).sort({ createdAt: -1 }));
});

// GET /api/work-orders/:id  (own customer, assigned mechanic, manager)
// Billing relies on `status` and `customerId` in this response.
router.get("/api/work-orders/:id", requireRole("customer", "mechanic", "manager"), async (req, res) => {
  const workOrder = await findAccessible(req, res);
  if (workOrder) res.json(workOrder);
});

// PATCH /api/work-orders/:id/status  (assigned mechanic, manager)
router.patch("/api/work-orders/:id/status", requireRole("mechanic", "manager"), async (req, res) => {
  const { status } = req.body ?? {};
  if (!STATUSES.includes(status)) {
    return fail(res, 400, "VALIDATION_ERROR", `status must be one of: ${STATUSES.join(", ")}`);
  }

  const workOrder = await findAccessible(req, res);
  if (!workOrder) return;

  workOrder.status = status;
  workOrder.completedAt = status === "completed" ? new Date() : undefined;
  res.json(await workOrder.save());
});

// DELETE /api/work-orders/:id  (manager). Also the fix for a wrong mechanic: delete, then create again.
router.delete("/api/work-orders/:id", requireRole("manager"), async (req, res) => {
  const workOrder = await WorkOrder.findByIdAndDelete(req.params.id);
  if (!workOrder) return fail(res, 404, "NOT_FOUND", "No such work order");
  res.status(204).end();
});

module.exports = router;
