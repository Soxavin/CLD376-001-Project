// api-gateway/src/policy.js
// One row per endpoint: method + path pattern -> roles allowed.
// ":id" matches exactly one path segment. A request matching no row is
// rejected with 403 (deny by default), so a forgotten row blocks access
// instead of silently opening it.
//
// Rows are copied from the Roles column of each service's table in the PRD.
// "Own customer", "Assigned mechanic" and "Author" appear here as just that
// role: the gateway can't know who owns a record, the service checks that.
// EACH OWNER: please verify your service's rows below against your spec.
const ALL = ["customer", "mechanic", "manager"];

module.exports = [
  // Registration (M2)
  { method: "POST",   path: "/api/users/staff",             roles: ["manager"] },
  { method: "GET",    path: "/api/users",                   roles: ["manager"] },

  // Login (M3)
  { method: "GET",    path: "/api/auth/me",                 roles: ALL },
  { method: "GET",    path: "/api/auth/verify",             roles: ALL },

  // Vehicles (M1)
  { method: "POST",   path: "/api/vehicles",                roles: ["customer"] },
  { method: "GET",    path: "/api/vehicles",                roles: ALL },
  { method: "GET",    path: "/api/vehicles/:id",            roles: ALL },
  { method: "PUT",    path: "/api/vehicles/:id",            roles: ["customer", "manager"] },
  { method: "DELETE", path: "/api/vehicles/:id",            roles: ["customer", "manager"] },

  // Booking (M1)
  { method: "POST",   path: "/api/bookings",                roles: ["customer"] },
  { method: "GET",    path: "/api/bookings",                roles: ["customer", "manager"] },
  { method: "GET",    path: "/api/bookings/:id",            roles: ["customer", "manager"] },
  { method: "PATCH",  path: "/api/bookings/:id/status",     roles: ["customer", "manager"] },
  { method: "DELETE", path: "/api/bookings/:id",            roles: ["manager"] },

  // Work Orders (M2)
  { method: "POST",   path: "/api/work-orders",             roles: ["manager"] },
  { method: "GET",    path: "/api/work-orders",             roles: ALL },
  { method: "GET",    path: "/api/work-orders/:id",         roles: ALL },
  { method: "PATCH",  path: "/api/work-orders/:id/status",  roles: ["mechanic", "manager"] },
  { method: "DELETE", path: "/api/work-orders/:id",         roles: ["manager"] },

  // Repair Notes (M2)
  { method: "POST",   path: "/api/notes",                   roles: ["mechanic"] },
  { method: "GET",    path: "/api/notes",                   roles: ["mechanic", "manager"] },
  { method: "GET",    path: "/api/notes/:id",               roles: ["mechanic", "manager"] },
  { method: "PUT",    path: "/api/notes/:id",               roles: ["mechanic"] },
  { method: "DELETE", path: "/api/notes/:id",               roles: ["mechanic", "manager"] },

  // Billing (M3)
  { method: "POST",   path: "/api/invoices",                roles: ["manager"] },
  { method: "GET",    path: "/api/invoices",                roles: ["customer", "manager"] },
  { method: "GET",    path: "/api/invoices/:id",            roles: ["customer", "manager"] },
  { method: "PATCH",  path: "/api/invoices/:id/pay",        roles: ["manager"] },
  { method: "DELETE", path: "/api/invoices/:id",            roles: ["manager"] },

  // Service Catalog (M3); its GET routes are public, see below
  { method: "POST",   path: "/api/catalog",                 roles: ["manager"] },
  { method: "PUT",    path: "/api/catalog/:id",             roles: ["manager"] },
  { method: "DELETE", path: "/api/catalog/:id",             roles: ["manager"] },
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
