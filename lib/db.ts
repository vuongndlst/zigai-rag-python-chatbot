import { User, dbConnect } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

export async function createUser(username: string, email: string, password: string) {
  await dbConnect();
  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) {
    if (existing.username === username) throw new Error("Username already taken");
    throw new Error("Email already registered");
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ username, email, password: hash });
  return { id: user._id.toString(), username: user.username, email: user.email };
}

export async function verifyUser(identifier: string, password: string) {
  await dbConnect();
  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
  if (!user) return null;
  if (user.isActive === false) return null;
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return null;
  return { id: user._id.toString(), username: user.username, email: user.email, role: user.role, isActive: user.isActive };
}

export async function createResetToken(email: string) {
  await dbConnect();
  const user = await User.findOne({ email });
  if (!user) throw new Error("Email not found");
  const token = crypto.randomBytes(32).toString("hex");
  user.resetToken = token;
  user.resetTokenExpiry = Date.now() + 1000 * 60 * 60; // 1h
  await user.save();
  return token;
}

export async function resetPassword(token: string, newPassword: string) {
  await dbConnect();
  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() },
  });
  if (!user) throw new Error("Invalid or expired token");
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.password = hash;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();
}
