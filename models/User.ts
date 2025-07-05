import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: { type: String, enum: ["user", "admin"], default: "user" },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
