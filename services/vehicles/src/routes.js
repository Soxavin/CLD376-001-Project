const express = require("express");
const Vehicle = require("./model");
const { requireRole } = require("./middleware/user");

const router = express.Router();

const fail = (res, status, code, message) =>
  res.status(status).json({ error: { code, message } });

// Loads a vehicle and applies the ownership rule: a customer may only touch
// their own car. Mechanic and manager access is limited per route by requireRole.
// Returns null after sending the 404/403 itself.
async function loadVehicle(req, res) {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    fail(res, 404, "NOT_FOUND", "No such vehicle");
    return null;
  }
  if (req.user.role === "customer" && !vehicle.ownerId.equals(req.user.id)) {
    fail(res, 403, "FORBIDDEN", "That vehicle isn't yours");
    return null;
  }
  return vehicle;
}

router.post("/api/vehicles", requireRole("customer"), async (req, res) => {
  const { plateNumber, make, model, year, color } = req.body ?? {};
  const vehicle = await Vehicle.create({ ownerId: req.user.id, plateNumber, make, model, year, color });
  res.status(201).json(vehicle);
});

router.get("/api/vehicles", requireRole("customer", "mechanic", "manager"), async (req, res) => {
  const filter = req.user.role === "customer" ? { ownerId: req.user.id } : {};
  res.json(await Vehicle.find(filter));
});

router.get("/api/vehicles/:id", requireRole("customer", "mechanic", "manager"), async (req, res) => {
  const vehicle = await loadVehicle(req, res);
  if (vehicle) res.json(vehicle);
});

router.put("/api/vehicles/:id", requireRole("customer", "manager"), async (req, res) => {
  const vehicle = await loadVehicle(req, res);
  if (!vehicle) return;
  // The owner can never change through the body.
  const { ownerId, _id, ...changes } = req.body ?? {};
  vehicle.set(changes);
  res.json(await vehicle.save());
});

router.delete("/api/vehicles/:id", requireRole("customer", "manager"), async (req, res) => {
  const vehicle = await loadVehicle(req, res);
  if (!vehicle) return;
  await vehicle.deleteOne();
  res.status(204).end();
});

module.exports = router;
