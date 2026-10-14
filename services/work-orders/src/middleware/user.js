// src/middleware/user.js
// The gateway already verified the token; services just read who is calling.
function readUser(req, res, next) {
  req.user = { id: req.headers["x-user-id"], role: req.headers["x-user-role"] };
  next();
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ error: { code: "FORBIDDEN", message: "Your role can't do this" } });

module.exports = { readUser, requireRole };
