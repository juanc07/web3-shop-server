// src/server.ts
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import crypto from 'crypto';

import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import paymentRoutes from "./routes/paymentRoutes";

// Load environment variables FIRST
console.log("Attempting to load .env file..."); // Debug log
dotenv.config();
console.log("dotenv.config() executed."); // Debug log

// ===> ADD THIS DEBUG LOG <===
console.log(`DEBUG: Value of process.env.JWT_SECRET after dotenv: [${process.env.JWT_SECRET}]`);
// ===> END DEBUG LOG <===


// --- JWT Secret Check and Generation ---
let jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  if (!jwtSecret) {
    console.error("\n🔴 FATAL ERROR: JWT_SECRET is not defined in .env file or environment variables.");
  } else {
    console.warn(`\n⚠️ WARNING: Existing JWT_SECRET ([${jwtSecret}]) seems too short. Generating a new secure one.`);
  }
  const generatedSecret = crypto.randomBytes(64).toString('hex');
  console.error("🔑 A secure JWT Secret is required for signing authentication tokens.");
  console.error("   Please add the following line to your .env file:\n");
  console.log(`   JWT_SECRET=${generatedSecret}\n`);
  console.error("   Then, restart the server.\n");
  process.exit(1);
} else {
    // console.log("✅ JWT_SECRET loaded successfully."); // Keep or remove this confirmation
}
// --- End JWT Secret Check ---


// --- MongoDB URI Check ---
// ===> ADD THIS DEBUG LOG <===
console.log(`DEBUG: Value of process.env.MONGO_URI after dotenv: [${process.env.MONGO_URI}]`);
// ===> END DEBUG LOG <===
if (!process.env.MONGO_URI) {
    console.error("\n🔴 FATAL ERROR: MONGO_URI is not defined in .env file or environment variables.");
    console.error("   Please add MONGO_URI=<your_mongodb_connection_string> to your .env file.\n");
    process.exit(1);
} else {
    // console.log("✅ MONGO_URI loaded successfully."); // Keep or remove
}
// --- End MongoDB URI Check ---


const app = express();
app.use(cors());
app.use(express.json());

console.log("Importing route modules..."); // Debug log
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
console.log("Route modules imported and used."); // Debug log

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
      console.error("❌ MongoDB connection error:", err);
      process.exit(1);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));