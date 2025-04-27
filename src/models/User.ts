// src/models/User.ts
import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId; // Explicitly define _id
  email?: string;
  password?: string;
  roles: ("admin" | "seller" | "buyer")[];
  firstName?: string;
  lastName?: string;
  username?: string;
  mobileNumber?: string;
  createdAt: Date;
  isSuperadmin?: boolean;
  solanaWallet?: string | null;
  piWallet?: string | null;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: { type: String, unique: true, sparse: true },
  password: { type: String, select: false },
  roles: { type: [String], enum: ["admin", "seller", "buyer"], default: ["buyer", "seller"] },
  firstName: { type: String },
  lastName: { type: String },
  username: { type: String, unique: true, sparse: true },
  mobileNumber: { type: String },
  createdAt: { type: Date, default: Date.now },
  isSuperadmin: { type: Boolean, default: false },
  solanaWallet: { type: String, unique: true, sparse: true },
  piWallet: { type: String, unique: true, sparse: true },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>("User", userSchema);