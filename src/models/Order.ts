// src/models/Order.ts
import mongoose, { Schema, Document } from "mongoose";

interface IOrder extends Document {
  user: mongoose.Types.ObjectId | null;
  products: { product: mongoose.Types.ObjectId; quantity: number }[];
  total: number;
  status: "pending" | "completed" | "cancelled";
  paymentMethod: "solana" | "pi" | "other";
  paymentSignature?: string;
  createdAt: Date;
}

const orderSchema = new Schema<IOrder>({
  user: { type: Schema.Types.ObjectId, ref: "User", default: null },
  products: [
    {
      product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: { type: Number, required: true },
    },
  ],
  total: { type: Number, required: true },
  status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
  paymentMethod: { type: String, enum: ["solana", "pi", "other"], required: true },
  paymentSignature: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IOrder>("Order", orderSchema);