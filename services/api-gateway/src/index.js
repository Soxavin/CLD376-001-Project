const express = require("express");

const { PORT = 3000, INSTANCE_NAME = "api-gateway" } = process.env;

const app = express();
// No express.json() here: the gateway forwards bodies untouched, and parsing
// them would leave proxied POST/PUT requests empty.

app.get("/health", (req, res) => {
  res.json({ service: "api-gateway", instance: INSTANCE_NAME, status: "ok" });
});

// TODO (M1): JWT check, policy.js enforcement, identity headers, proxying,
// catalog round-robin.

app.listen(PORT, () => console.log(`${INSTANCE_NAME} listening on port ${PORT}`));
