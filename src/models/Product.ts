// src/models/Product.ts
import mongoose, { Schema, Document } from "mongoose";
// Import IUser if you need to type the populated seller field more specifically elsewhere
// import { IUser } from './User';

// Interface defining the structure of a Product document in Mongoose
// Extend Mongoose's Document type for standard Mongoose properties (_id, etc.)
export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  stock: number;
  seller: mongoose.Types.ObjectId; // Reference to the User who is the seller
  // --- ADDED Image Fields ---
  imagePublicId?: string;         // Optional: Store Cloudinary Public ID (recommended)
  imageUrl?: string;              // Optional: Store the secure URL from Cloudinary
  // --- End Added Image Fields ---
  createdAt: Date;                // Automatically managed by timestamps option
  updatedAt: Date;                // Automatically managed by timestamps option
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true }, // Added trim
  description: { type: String, required: true, trim: true }, // Added trim
  price: { type: Number, required: true, min: [0, 'Price cannot be negative'] }, // Added min validation
  stock: {
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative'], // Added min validation
    validate: { // Ensure stock is an integer
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value for stock'
    }
  },
  seller: { type: Schema.Types.ObjectId, ref: "User", required: true },

  // --- ADDED Image Fields to Schema ---
  imagePublicId: { type: String, default: null }, // Default to null or undefined
  imageUrl: { type: String, default: null }, // Default to null or undefined
  // --- End Added Image Fields ---

  // createdAt: { type: Date, default: Date.now }, // No longer needed with timestamps: true
}, {
  timestamps: true // Automatically add createdAt and updatedAt fields
});

// Create and export the Mongoose model
// Mongoose prevents redefining the model if it already exists
const Product = mongoose.models.Product || mongoose.model<IProduct>("Product", productSchema);

export default Product;