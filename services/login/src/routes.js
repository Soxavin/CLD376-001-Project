const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("./model");

const router = express.Router();

const fail = (res, status, code, message) =>
  res.status(status).json({ error: { code, message } });

const TOKEN_LIFETIME_SECONDS = 3600; // 1 hour, per the JWT contract in the PRD

// Compared against when the email doesn't exist, so an unknown email takes about
// as long to reject as a wrong password (another small anti-enumeration measure).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

// POST /api/auth/login  (public)
router.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return fail(res, 400, "VALIDATION_ERROR", "email and password are required");
  }

  // passwordHash is select:false, so we must ask for it explicitly.
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
  const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  // One message for both failures: don't reveal which emails are registered.
  if (!user || !passwordOk) {
    return fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  // JWT contract: { sub, role, name, iat, exp }, HS256, 1 hour.
  const token = jwt.sign(
    { sub: String(user._id), role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: TOKEN_LIFETIME_SECONDS }
  );

  res.json({
    token,
    expiresIn: TOKEN_LIFETIME_SECONDS,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// GET /api/auth/me  (any role): profile of the caller. The gateway put the id in x-user-id.
router.get("/api/auth/me", async (req, res) => {
  if (!req.user.id) return fail(res, 401, "NO_TOKEN", "Missing identity");
  const user = await User.findById(req.user.id); // passwordHash is never selected
  if (!user) return fail(res, 404, "NOT_FOUND", "User not found");
  res.json(user);
});

// GET /api/auth/verify  (any role): the decoded token claims, handy for screenshots.
router.get("/api/auth/verify", (req, res) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme === "Bearer" && token) {
    try {
      // The gateway already checked this; verifying again here is cheap and lets us
      // return the full claims (name, iat, exp) which the headers don't carry.
      const claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
      return res.json(claims);
    } catch {
      return fail(res, 401, "INVALID_TOKEN", "Token is invalid or expired");
    }
  }
  // Called directly with only the identity headers (local testing without the gateway).
  if (!req.user.id) return fail(res, 401, "NO_TOKEN", "Send an Authorization: Bearer <token> header");
  res.json({ sub: req.user.id, role: req.user.role });
});

module.exports = router;
