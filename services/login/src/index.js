const { PORT = 3002, INSTANCE_NAME = "login", MONGO_URI, JWT_SECRET } = process.env;

// Fail fast: without these the service can't do its job.
if (!MONGO_URI || !JWT_SECRET) {
  console.error("MONGO_URI and JWT_SECRET must be set");
  process.exit(1);
}

const express = require("express");
const mongoose = require("mongoose");
const { readUser } = require("./middleware/user");
const routes = require("./routes");

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ service: "login", instance: INSTANCE_NAME, status: "ok" });
});

app.use(readUser);
app.use(routes);

app.use((req, res) =>
  res.status(404).json({ error: { code: "NOT_FOUND", message: "No such route" } })
);

// Turns any thrown error into the shared error shape. Never leaks stack traces.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Body is not valid JSON" } });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message } });
  }
  if (err.name === "CastError") {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "No such record" } });
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`${INSTANCE_NAME} listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
