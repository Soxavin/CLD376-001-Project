const express = require("express");
const mongoose = require("mongoose");
const routes = require("./routes");
const { readUser } = require("./middleware/user");

const SERVICE = "work-orders";
const { PORT = 3005, INSTANCE_NAME = SERVICE, MONGO_URI } = process.env;

const app = express();
app.use(express.json());
app.use(readUser);

app.get("/health", (req, res) => {
  res.json({ service: SERVICE, instance: INSTANCE_NAME, status: "ok" });
});

app.use(routes);

app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

// Express 5 forwards rejected promises here, so routes don't need try/catch.
// Clients only ever see the shared error shape; details go to the log.
app.use((err, req, res, next) => {
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message } });
  }
  if (err.name === "CastError") {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "No such record" } });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: { code: "DUPLICATE", message: "That record already exists" } });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Body is not valid JSON" } });
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
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  });
