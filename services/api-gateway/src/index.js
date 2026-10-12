const { PORT = 3000, INSTANCE_NAME = "api-gateway", JWT_SECRET } = process.env;

// Fail fast: without the secret every token would be rejected.
if (!JWT_SECRET) {
  console.error("JWT_SECRET is not set");
  process.exit(1);
}

const express = require("express");
const { authToken, authRole, fail } = require("./auth");
const { isPublic } = require("./routes");
const { proxies, upstreams } = require("./proxy");

const app = express();
// No express.json() here: the gateway forwards bodies untouched, and parsing
// them would leave proxied POST/PUT requests empty.

app.get("/health", (req, res) => {
  res.json({ service: "api-gateway", instance: INSTANCE_NAME, status: "ok", upstreams });
});

// Every request: strip identity headers, then public check -> token -> policy.
app.use((req, res, next) => {
  // A client must never be able to claim its own identity.
  delete req.headers["x-user-id"];
  delete req.headers["x-user-role"];

  if (isPublic(req)) return next();

  authToken(req, res, () =>
    authRole(req, res, () => {
      // The proxy copies req.headers to the upstream request, so these reach
      // the service. Authorization stays in place for service-to-service calls.
      req.headers["x-user-id"] = String(req.user.sub);
      req.headers["x-user-role"] = req.user.role;
      next();
    })
  );
});

app.use(proxies);

app.use((req, res) => fail(res, 404, "NOT_FOUND", "No such route"));

// Anything unexpected: log it, return the generic shape.
app.use((err, req, res, next) => {
  console.error(err);
  fail(res, 500, "INTERNAL_ERROR", "Something went wrong");
});

app.listen(PORT, () => console.log(`${INSTANCE_NAME} listening on port ${PORT}`));
