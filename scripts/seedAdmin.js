require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User"); // đường dẫn đúng đến schema User

const username = process.env.ADMIN_USERNAME || "admin";
const email = process.env.ADMIN_EMAIL || "admin@gmail.com";
const password = process.env.ADMIN_PASSWORD || "admin123";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) {
    console.log("Admin already exists.");
    return process.exit(0);
  }

  const hash = await bcrypt.hash(password, 10);
  await User.create({
    username,
    email,
    password: hash,
    role: "admin",
    isActive: true
  });

  console.log(`✅ Admin created: ${username} / ${email}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error seeding admin:", err);
  process.exit(1);
});
