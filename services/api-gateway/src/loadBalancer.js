// api-gateway/src/loadBalancer.js
const targets = process.env.CATALOG_URLS.split(",");
let next = 0;

// Each call returns the next replica in turn: A, B, A, B...
function pickCatalogTarget() {
  const target = targets[next % targets.length];
  next += 1;
  return target;
}

module.exports = { pickCatalogTarget, targets };
