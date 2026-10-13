const express = require("express");
const mongoose = require("mongoose");
const Invoice = require("./model");
const { requireRole } = require("./middleware/user");

const router = express.Router();

const fail = (res, status, code, message) =>
  res.status(status).json({ error: { code, message } });

const PAYMENT_METHODS = ["cash", "bank_transfer", "card"];

// ---------------------------------------------------------------------------
// Cross-service call: GET /api/work-orders/:id, through the gateway, with the
// caller's own token (the contract in the PRD). Returns { status, body }, or
// null when the gateway can't be reached or takes longer than 5 seconds.
//
// TEMPORARY STUB: until Work Orders (Member 2) is running, set
// WORK_ORDERS_STUB=true and this returns a fixed work order instead of calling
// anyone. Set WORK_ORDERS_STUB_STATUS=in_progress to rehearse test N11.
// Delete the stub branch once the real service exists.
// ---------------------------------------------------------------------------
async function getWorkOrder(req, id) {
  if (process.env.WORK_ORDERS_STUB === "true") {
    return {
      status: 200,
      body: {
        _id: id,
        customerId: "6702a0b7c8e4b2a1d3f4e590", // customer 1 from the PRD examples
        status: process.env.WORK_ORDERS_STUB_STATUS || "completed",
      },
    };
  }
  try {
    const response = await fetch(`${process.env.GATEWAY_INTERNAL_URL}/api/work-orders/${id}`, {
      headers: { authorization: req.headers.authorization || "" },
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  } catch (err) {
    console.error(`Work Orders call failed: ${err.name}: ${err.message}`);
    return null;
  }
}

// POST /api/invoices  (manager)
router.post("/api/invoices", requireRole("manager"), async (req, res) => {
  const { workOrderId, lineItems } = req.body || {};
  if (!mongoose.isValidObjectId(workOrderId)) {
    return fail(res, 400, "VALIDATION_ERROR", "workOrderId is required and must be a valid id");
  }
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return fail(res, 400, "VALIDATION_ERROR", "lineItems must be a non-empty array");
  }

  const workOrder = await getWorkOrder(req, workOrderId);
  if (!workOrder) {
    return fail(res, 502, "UPSTREAM_UNAVAILABLE", "A service this request needs is down or timed out");
  }
  if (workOrder.status === 404) return fail(res, 404, "NOT_FOUND", "Work order not found");
  if (workOrder.status !== 200 || !workOrder.body) {
    return fail(res, 502, "UPSTREAM_UNAVAILABLE", "A service this request needs is down or timed out");
  }
  if (workOrder.body.status !== "completed") {
    return fail(res, 400, "WORK_ORDER_NOT_COMPLETED", "An invoice can only be created for a completed work order");
  }

  // customerId is copied from the work order; totalCents is computed by the model.
  // Neither comes from the request body.
  const invoice = await Invoice.create({
    workOrderId,
    customerId: workOrder.body.customerId,
    lineItems,
  });
  res.status(201).json(invoice);
});

// GET /api/invoices  (customer, manager). A customer silently sees only their own.
router.get("/api/invoices", requireRole("customer", "manager"), async (req, res) => {
  const filter = {};
  if (req.user.role === "customer") filter.customerId = req.user.id;
  if (typeof req.query.status === "string") filter.status = req.query.status;
  res.json(await Invoice.find(filter).sort({ createdAt: -1 }));
});

// GET /api/invoices/:id  (own customer, manager)
router.get("/api/invoices/:id", requireRole("customer", "manager"), async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return fail(res, 404, "NOT_FOUND", "Invoice not found");
  if (req.user.role === "customer" && String(invoice.customerId) !== req.user.id) {
    return fail(res, 403, "FORBIDDEN", "This isn't your invoice");
  }
  res.json(invoice);
});

// PATCH /api/invoices/:id/pay  (manager)
router.patch("/api/invoices/:id/pay", requireRole("manager"), async (req, res) => {
  const { paymentMethod } = req.body || {};
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return fail(res, 400, "VALIDATION_ERROR", `paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}`);
  }
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return fail(res, 404, "NOT_FOUND", "Invoice not found");
  if (invoice.status === "paid") {
    return fail(res, 400, "VALIDATION_ERROR", "This invoice is already paid");
  }
  invoice.status = "paid";
  invoice.paymentMethod = paymentMethod;
  invoice.paidAt = new Date();
  await invoice.save();
  res.json(invoice);
});

// DELETE /api/invoices/:id  (manager). Only while unpaid, so paid records never disappear.
router.delete("/api/invoices/:id", requireRole("manager"), async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return fail(res, 404, "NOT_FOUND", "Invoice not found");
  if (invoice.status === "paid") {
    return fail(res, 400, "VALIDATION_ERROR", "Paid invoices can't be deleted");
  }
  await invoice.deleteOne();
  res.status(204).end();
});

module.exports = router;
