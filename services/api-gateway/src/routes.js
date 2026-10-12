// Turns the patterns in policy.js into regular expressions, once at startup.
const policy = require("./policy");

// "/api/vehicles/:id" -> /^\/api\/vehicles\/[^/]+\/?$/
// ":id" matches exactly one path segment; a trailing slash is tolerated.
function compile(row) {
  const source = row.path
    .split("/")
    .map((part) => (part.startsWith(":") ? "[^/]+" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return { ...row, regex: new RegExp(`^${source}/?$`) };
}

const publicRows = policy.publicRoutes.map(compile);
const policyRows = policy.map(compile);

// req.path never includes the query string.
const matches = (row, req) => row.method === req.method && row.regex.test(req.path);

const isPublic = (req) => publicRows.some((row) => matches(row, req));
const findPolicy = (req) => policyRows.find((row) => matches(row, req));

module.exports = { isPublic, findPolicy };
