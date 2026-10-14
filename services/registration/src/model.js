const mongoose = require("mongoose");

// Registration is the only writer of auth_db.users. Login keeps a read-only
// copy of this schema, so keep the two in sync if a field ever changes.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: String,
    passwordHash: { type: String, required: true, select: false }, // never returned
    role: { type: String, enum: ["customer", "mechanic", "manager"], default: "customer" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
