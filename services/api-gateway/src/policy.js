// api-gateway/src/policy.js
// One row per endpoint: method + path pattern -> roles allowed.
// ":id" matches any one path segment. A request matching no row is rejected
// with 403 (deny by default), so a forgotten row blocks access instead of
// silently opening it. Owners add rows for their endpoints in their PR,
// copying the Roles column from the PRD.
module.exports = [
  // { method: "POST", path: "/api/bookings", roles: ["customer"] },
];

// Reachable without a token.
module.exports.publicRoutes = [
  { method: "GET",  path: "/health" },
  { method: "POST", path: "/api/auth/register" },
  { method: "POST", path: "/api/auth/login" },
  { method: "GET",  path: "/api/catalog" },
  { method: "GET",  path: "/api/catalog/health" },
  { method: "GET",  path: "/api/catalog/:id" },
];
