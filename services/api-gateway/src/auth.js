const jwt = require("jsonwebtoken");
const { findPolicy } = require("./routes");

const fail = (res, status, code, message) =>
  res.status(status).json({ error: { code, message } });

// Step 1: is there a valid token? Puts the verified claims on req.user.
function authToken(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return fail(res, 401, "NO_TOKEN", "Send an Authorization: Bearer <token> header");
  }
  try {
    // Pinning the algorithm stops a token from choosing its own ("alg": "none").
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return fail(res, 401, "INVALID_TOKEN", "Token is invalid or expired");
  }
  next();
}

// Step 2: may this role call this method + path? Deny by default.
function authRole(req, res, next) {
  const row = findPolicy(req);
  if (!row || !row.roles.includes(req.user.role)) {
    return fail(res, 403, "FORBIDDEN", "Your role can't do this");
  }
  next();
}

module.exports = { authToken, authRole, fail };
