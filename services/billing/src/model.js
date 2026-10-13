const mongoose = require("mongoose");

const isInteger = {
  validator: Number.isInteger,
  message: "{PATH} must be a whole number",
};

// Money is integer cents (2500 = $25.00), so there are no floating-point surprises.
const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true }, // "Oil change"
    quantity: { type: Number, required: true, min: 1, validate: isInteger },
    unitPriceCents: { type: Number, required: true, min: 0, validate: isInteger }, // 2500
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    // unique: the DATABASE rejects a second invoice for the same work order,
    // even if two requests arrive at the same instant.
    workOrderId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, // copied from the work order
    lineItems: {
      type: [lineItemSchema],
      validate: { validator: (items) => items.length > 0, message: "lineItems must not be empty" },
    },
    totalCents: { type: Number, validate: isInteger }, // computed by the server, never by the client
    status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    paymentMethod: { type: String, enum: ["cash", "bank_transfer", "card"] },
    paidAt: Date,
  },
  { timestamps: true }
);

// Always recompute the total from the line items before saving.
invoiceSchema.pre("validate", function () {
  this.totalCents = this.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
});

module.exports = mongoose.model("Invoice", invoiceSchema);
