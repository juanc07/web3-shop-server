// src/models/Order.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IOrderProduct {
  product: mongoose.Types.ObjectId;
  quantity: number;
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  products: IOrderProduct[];
  total: number; // Total in USDC, SOL, or Pi based on paymentMethod
  status: "pending" | "completed" | "cancelled" | "failed";
  paymentMethod: "usdc" | "solana" | "pi";
  paymentSignature?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    products: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending", "completed", "cancelled", "failed"], default: "pending" },
    paymentMethod: { type: String, enum: ["usdc", "solana", "pi"], required: true },
    paymentSignature: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>("Order", orderSchema);