// Inserts the shop's 6 common services. Safe to run again: matched by name,
// so it updates prices instead of creating duplicates. Run from the repo root:
// npm run seed:catalog
const mongoose = require("mongoose");

const { MONGO_URI_CATALOG } = process.env;
if (!MONGO_URI_CATALOG) {
  console.error("MONGO_URI_CATALOG is not set (see scripts/.env.example)");
  process.exit(1);
}

// Same shape as the model in services/service-catalog.
const CatalogService = mongoose.model(
  "CatalogService",
  new mongoose.Schema(
    {
      name: { type: String, required: true, unique: true, trim: true },
      description: String,
      priceCents: { type: Number, min: 0 },
      durationMinutes: { type: Number, min: 0 },
      active: { type: Boolean, default: true },
    },
    { timestamps: true, collection: "catalog" }
  )
);

// Money is integer cents: 2500 = $25.00
const items = [
  { name: "Oil change", description: "Engine oil and filter replacement", priceCents: 2500, durationMinutes: 30 },
  { name: "Brake pad replacement", description: "Replace front or rear brake pads", priceCents: 6000, durationMinutes: 90 },
  { name: "Tire rotation", description: "Rotate and balance all four tires", priceCents: 1500, durationMinutes: 45 },
  { name: "Battery replacement", description: "Test and replace the car battery", priceCents: 9000, durationMinutes: 30 },
  { name: "Air-con check", description: "Air conditioning inspection and gas top-up", priceCents: 3500, durationMinutes: 45 },
  { name: "General inspection", description: "Full multi-point vehicle inspection", priceCents: 4000, durationMinutes: 60 },
];

async function main() {
  await mongoose.connect(MONGO_URI_CATALOG);
  for (const item of items) {
    await CatalogService.findOneAndUpdate(
      { name: item.name },
      { $set: { ...item, active: true } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    console.log(`ok  ${item.name} ($${(item.priceCents / 100).toFixed(2)})`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
