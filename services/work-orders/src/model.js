const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const workOrderSchema = new mongoose.Schema(
  {
    // unique: one work order per booking. The index, not a code check, rejects the second one.
    bookingId: { type: ObjectId, required: true, unique: true },
    customerId: { type: ObjectId, required: true, index: true }, // copied from the booking
    vehicleId: { type: ObjectId, required: true }, // copied from the booking
    mechanicId: { type: ObjectId, required: true, index: true }, // assigned mechanic
    description: { type: String, required: true }, // copied from booking.serviceRequested, editable
    status: { type: String, enum: ["assigned", "in_progress", "completed"], default: "assigned" },
    completedAt: Date, // set when status becomes completed
  },
  { timestamps: true }
);

module.exports = mongoose.model("WorkOrder", workOrderSchema);
