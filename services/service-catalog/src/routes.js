const express = require("express");
const CatalogService = require("./model");
const { requireRole } = require("./middleware/user");

const router = express.Router();
const { INSTANCE_NAME = "catalog-a" } = process.env;

const notFound = (res) =>
  res.status(404).json({ error: { code: "NOT_FOUND", message: "No such service in the catalog" } });

// Only these fields can be written by a client. (Mongoose would drop unknown
// fields anyway; picking them explicitly makes that obvious.)
const FIELDS = ["name", "description", "priceCents", "durationMinutes", "active"];
const pick = (body = {}) =>
  Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

// Load balancer demo: shows which replica answered.
// MUST be defined before "/api/catalog/:id", or "health" would be read as an id.
router.get("/api/catalog/health", (req, res) => {
  res.json({ service: "catalog", instance: INSTANCE_NAME, status: "ok" });
});

// GET /api/catalog  (public). ?active=true hides inactive services.
router.get("/api/catalog", async (req, res) => {
  const filter = req.query.active === "true" ? { active: true } : {};
  res.json(await CatalogService.find(filter).sort({ name: 1 }));
});

// GET /api/catalog/:id  (public)
router.get("/api/catalog/:id", async (req, res) => {
  const item = await CatalogService.findById(req.params.id);
  if (!item) return notFound(res);
  res.json(item);
});

// POST /api/catalog  (manager). A duplicate name returns 409 via the unique index.
router.post("/api/catalog", requireRole("manager"), async (req, res) => {
  const item = await CatalogService.create(pick(req.body));
  res.status(201).json(item);
});

// PUT /api/catalog/:id  (manager)
router.put("/api/catalog/:id", requireRole("manager"), async (req, res) => {
  const item = await CatalogService.findByIdAndUpdate(req.params.id, pick(req.body), {
    new: true,
    runValidators: true,
  });
  if (!item) return notFound(res);
  res.json(item);
});

// DELETE /api/catalog/:id  (manager)
router.delete("/api/catalog/:id", requireRole("manager"), async (req, res) => {
  const item = await CatalogService.findByIdAndDelete(req.params.id);
  if (!item) return notFound(res);
  res.status(204).end();
});

module.exports = router;
