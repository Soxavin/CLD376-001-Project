const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, // user id from the token
    plateNumber: { type: String, required: true, unique: true, uppercase: true, trim: true }, // "2A-1234"
    make: { type: String, required: true }, // "Toyota"
    model: { type: String, required: true }, // "Camry"
    year: { type: Number, min: 1980 },
    color: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
