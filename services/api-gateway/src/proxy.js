const { createProxyMiddleware } = require("http-proxy-middleware");
const { pickCatalogTarget, targets } = require("./loadBalancer");

// Paths are forwarded unchanged. That's why these proxies are mounted with
// app.use(proxy) and a pathFilter: app.use("/api/x", proxy) would make
// Express strip "/api/x" before the proxy sees the URL.
const upstreams = {
  registration: process.env.REGISTRATION_URL,
  login: process.env.LOGIN_URL,
  booking: process.env.BOOKING_URL,
  vehicles: process.env.VEHICLES_URL,
  workOrders: process.env.WORK_ORDERS_URL,
  notes: process.env.NOTES_URL,
  billing: process.env.BILLING_URL,
  catalog: targets,
};

const startsWith = (prefix) => (pathname) =>
  pathname === prefix || pathname.startsWith(prefix + "/");

function onError(err, req, res) {
  console.error(`proxy error for ${req.method} ${req.url}: ${err.code || err.message}`);
  if (typeof res.writeHead !== "function" || res.headersSent) return;
  res.status(502).json({
    error: { code: "UPSTREAM_UNAVAILABLE", message: "A service this request needs is down or timed out" },
  });
}

function proxyTo(target, pathFilter, extra = {}) {
  return createProxyMiddleware({
    target,
    pathFilter,
    changeOrigin: true,
    proxyTimeout: 5000,
    on: { error: onError },
    ...extra,
  });
}

// Order matters: register and /api/users go to Registration before the
// general /api/auth/* rule sends everything else to Login.
const proxies = [
  proxyTo(upstreams.registration, (p) => p === "/api/auth/register" || startsWith("/api/users")(p)),
  proxyTo(upstreams.login, startsWith("/api/auth")),
  proxyTo(upstreams.booking, startsWith("/api/bookings")),
  proxyTo(upstreams.vehicles, startsWith("/api/vehicles")),
  proxyTo(upstreams.workOrders, startsWith("/api/work-orders")),
  proxyTo(upstreams.notes, startsWith("/api/notes")),
  proxyTo(upstreams.billing, startsWith("/api/invoices")),
  proxyTo(targets[0], startsWith("/api/catalog"), { router: () => pickCatalogTarget() }),
];

module.exports = { proxies, upstreams };
