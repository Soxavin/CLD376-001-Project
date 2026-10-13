// Creates 1 manager, 2 mechanics and 2 customers with a known test password.
// Safe to run again: users are matched by email, so ids stay the same and the
// password is reset to the one below. Run from the repo root: npm run seed:users
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const { MONGO_URI_AUTH } = process.env;
if (!MONGO_URI_AUTH) {
  console.error("MONGO_URI_AUTH is not set (see scripts/.env.example)");
  process.exit(1);
}

const TEST_PASSWORD = "Test1234!";

// Same shape as the User model owned by Registration.
const User = mongoose.model(
  "User",
  new mongoose.Schema(
    {
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      phone: String,
      passwordHash: { type: String, required: true, select: false },
      role: { type: String, enum: ["customer", "mechanic", "manager"], default: "customer" },
    },
    { timestamps: true }
  )
);

const users = [
  { name: "Shop Manager", email: "manager@shop.test", phone: "012000001", role: "manager" },
  { name: "Mechanic One", email: "mechanic1@shop.test", phone: "012000002", role: "mechanic" },
  { name: "Mechanic Two", email: "mechanic2@shop.test", phone: "012000003", role: "mechanic" },
  { name: "Customer One", email: "customer1@shop.test", phone: "012000004", role: "customer" },
  { name: "Customer Two", email: "customer2@shop.test", phone: "012000005", role: "customer" },
];

async function main() {
  await mongoose.connect(MONGO_URI_AUTH);
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10); // cost 10, as the PRD says

  console.log("role      email                  _id");
  for (const u of users) {
    const doc = await User.findOneAndUpdate(
      { email: u.email },
      { $set: { ...u, passwordHash } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`${u.role.padEnd(9)} ${u.email.padEnd(22)} ${doc._id}`);
  }
  console.log(`\nAll passwords: ${TEST_PASSWORD}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
