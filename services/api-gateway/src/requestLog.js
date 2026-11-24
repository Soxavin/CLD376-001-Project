// Writes one line per request to LOG_DIR/gateway.log.
// On Kubernetes, LOG_DIR is the shared volume, so the log viewer can read the
// same file. If LOG_DIR isn't set (local runs), we just skip the file.
const fs = require("fs");
const path = require("path");

const { LOG_DIR, INSTANCE_NAME = "api-gateway" } = process.env;

let logFile = null;
if (LOG_DIR) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  logFile = path.join(LOG_DIR, "gateway.log");
  console.log(`writing request log to ${logFile}`);
}

function requestLog(req, res, next) {
  if (!logFile) return next();

  const started = Date.now();

  // "finish" fires once the response has gone out, so we know the status code
  // and who made the call (req.user is only set for requests with a valid token).
  res.on("finish", () => {
    const role = req.user ? req.user.role : "guest";
    const line = [
      new Date().toISOString(),
      INSTANCE_NAME,
      req.method,
      req.originalUrl,
      res.statusCode,
      role,
      `${Date.now() - started}ms`,
    ].join(" ");

    // A logging problem should never break the actual request.
    fs.appendFile(logFile, line + "\n", (err) => {
      if (err) console.error(`could not write request log: ${err.message}`);
    });
  });

  next();
}

module.exports = { requestLog };
