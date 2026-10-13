const { PORT = 3007, INSTANCE_NAME = "billing", MONGO_URI } = process.env;

// Fail fast: without the database the service can't do its job.
if (!MONGO_URI) {
  console.error("MONGO_URI is not set");
  process.exit(1);
}

const express = require("express");
const mongoose = require("mongoose");
const { readUser } = require("./middleware/user");
const routes = require("./routes");

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ service: "billing", instance: INSTANCE_NAME, status: "ok" });
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
  if (err.code === 11000) {
    return res.status(409).json({ error: { code: "DUPLICATE", message: "An invoice already exists for this work order" } });
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
