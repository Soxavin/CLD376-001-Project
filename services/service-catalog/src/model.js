const mongoose = require("mongoose");

const isInteger = {
  validator: Number.isInteger,
  message: "{PATH} must be a whole number",
};

// The shop's price list. Money is integer cents (6000 = $60.00).
const catalogSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // "Brake pad replacement"
    description: String,
    priceCents: { type: Number, min: 0, validate: isInteger },
    durationMinutes: { type: Number, min: 0, validate: isInteger }, // estimated time
    active: { type: Boolean, default: true }, // hide without deleting
  },
  { timestamps: true, collection: "catalog" }
);

module.exports = mongoose.model("CatalogService", catalogSchema);
