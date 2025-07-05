const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: { type: String, enum: ["user", "admin"], default: "user" },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
