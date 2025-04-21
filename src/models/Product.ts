// src/models/Product.ts
import mongoose, { Schema, Document } from "mongoose";

interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  seller: mongoose.Types.ObjectId;
  stock: number;
  createdAt: Date;
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
  stock: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IProduct>("Product", productSchema);