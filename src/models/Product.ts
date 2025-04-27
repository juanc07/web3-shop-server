// src/models/Product.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;    // Price in USDC
  solPrice: number; // Price in SOL
  piPrice: number;  // Price in Pi
  stock: number;
  seller: mongoose.Types.ObjectId;
  images?: { url: string; publicId: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: [0, "Price cannot be negative"] },
    solPrice: { type: Number, required: true, min: [0, "Solana price cannot be negative"] },
    piPrice: { type: Number, required: true, min: [0, "Pi price cannot be negative"] },
    stock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value for stock",
      },
    },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.models.Product || mongoose.model<IProduct>("Product", productSchema);

export default Product;