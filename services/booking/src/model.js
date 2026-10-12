const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, required: true },
    serviceRequested: { type: String, required: true, trim: true },
    preferredDate: {
      type: Date,
      required: true,
      validate: {
        validator: (value) => value > new Date(),
        message: "preferredDate must be in the future",
      },
    },
    note: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    managerNote: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", schema);
