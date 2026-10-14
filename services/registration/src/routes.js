const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("./model");
const { requireRole } = require("./middleware/user");

const router = express.Router();

const fail = (res, status, code, message) =>
  res.status(status).json({ error: { code, message } });

const STAFF_ROLES = ["mechanic", "manager"];

// Hashes the password and creates the user. The role is chosen by the caller of
// this function, never taken from the request body.
async function createUser({ name, email, phone, password }, role) {
  if (typeof password !== "string" || password.length < 8) {
    const err = new Error("password must be a string of at least 8 characters");
    err.name = "ValidationError";
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, phone, passwordHash, role });
  // passwordHash is select:false for queries, but create() returns the full document.
  const { passwordHash: _omit, ...safe } = user.toObject();
  return safe;
}

// POST /api/auth/register  (public). Always a customer, whatever the body says.
router.post("/api/auth/register", async (req, res) => {
  const { name, email, phone, password } = req.body ?? {};
  res.status(201).json(await createUser({ name, email, phone, password }, "customer"));
});

// POST /api/users/staff  (manager). Creates a mechanic or another manager.
router.post("/api/users/staff", requireRole("manager"), async (req, res) => {
  const { name, email, phone, password, role } = req.body ?? {};
  if (!STAFF_ROLES.includes(role)) {
    return fail(res, 400, "VALIDATION_ERROR", `role must be one of: ${STAFF_ROLES.join(", ")}`);
  }
  res.status(201).json(await createUser({ name, email, phone, password }, role));
});

// GET /api/users  (manager). ?role=mechanic is used when assigning work orders.
router.get("/api/users", requireRole("manager"), async (req, res) => {
  const filter = {};
  if (typeof req.query.role === "string") filter.role = req.query.role;
  res.json(await User.find(filter).sort({ createdAt: -1 }));
});

module.exports = router;
