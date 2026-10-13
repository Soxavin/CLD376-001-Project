const mongoose = require("mongoose");

// Read-only copy of the User model. Registration (Member 2) is the only writer
// of auth_db.users; Login only reads it. If Registration changes this schema,
// update it here too.
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
