// src/models/User.ts
import mongoose, { Schema, Document } from "mongoose";

// Add 'export' here
export interface IUser extends Document {
  email: string;
  password: string; // Consider selecting this out in queries unless needed
  role: "admin" | "seller" | "buyer";
  name: string;
  createdAt: Date;
  isSuperadmin?: boolean; // Optional flag
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  // Ensure password selection is handled appropriately (e.g., select: false in schema or explicit .select('-password'))
  password: { type: String, required: true, select: false }, // Example: hide password by default
  role: { type: String, enum: ["admin", "seller", "buyer"], default: "buyer" },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isSuperadmin: { type: Boolean, default: false }, // Add default if needed
});

// Export the Mongoose model as the default export
export default mongoose.model<IUser>("User", userSchema);