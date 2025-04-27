import express from "express";
import mongoose from "mongoose";
import cors from "cors";

// Route Imports
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import cartRoutes from "./routes/cartRoutes";

import { expirePendingOrders } from "./services/orderService";

// Config Imports
// Assumes env.ts is run first via --require flag in package.json
import { getConfig } from "./config";
import { v2 as cloudinary } from "cloudinary";

// --- Load and Validate Configuration ---
let config;
try {
  console.log("[Server] Loading configuration...");
  config = getConfig(); // Load and validate config from environment variables
  console.log("[Server] Configuration loaded successfully.");
  // Log non-sensitive config values for confirmation
  console.log(`[Server] Config - NODE_ENV: ${config.NODE_ENV}`);
  console.log(`[Server] Config - PORT: ${config.PORT}`);
  console.log(`[Server] Config - MONGO_URI: Loaded`);
  console.log(`[Server] Config - JWT_SECRET: Loaded & Validated`);
  console.log(`[Server] Config - CLOUDINARY_CLOUD_NAME: Loaded`);
  console.log(`[Server] Config - SOLANA_NETWORK: ${config.SOLANA_NETWORK}`);
  console.log(`[Server] Config - SOLANA_RPC_URL: ${config.SOLANA_RPC_URL}`);
  console.log(`[Server] Config - FRONTEND_URL: ${config.FRONTEND_URL}`);
  console.log(`[Server] Config - API_KEY: Loaded`);
  console.log(`[Server] Config - WEBSITE_WALLET: Loaded`);

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} catch (error) {
  console.error("🔴 FATAL ERROR: Failed to load or validate configuration.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1); // Exit if config loading/validation fails
}
// --- End Configuration Loading ---

// --- Initialize Express App ---
const app = express();
console.log("[Server] Setting up middleware...");
// Enable CORS - Configure allowed origins
const allowedOrigins = [config.FRONTEND_URL, "http://localhost:4173"];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);
// Enable JSON body parsing
app.use(express.json());
console.log("[Server] Middleware set up.");
// --- End Middleware Setup ---

// --- Setup API Routes ---
console.log("[Server] Setting up API routes...");
app.use("/api/auth", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/cart", cartRoutes);
console.log("[Server] API routes set up.");
// --- End Route Setup ---

// --- Database Connection ---
console.log(`[Server] Attempting to connect to MongoDB at ${config.MONGO_URI ? "URI provided" : "URI MISSING!"}`);
mongoose
  .connect(config.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    // Start HTTP Server
    const PORT = config.PORT;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} [${config.NODE_ENV}]`);
      // Run expirePendingOrders every 5 minutes
      const intervalMinutes = 5;
      const intervalMs = intervalMinutes * 60 * 1000;
      setInterval(async () => {
        console.log("[Server] Running expirePendingOrders");
        try {
          const modifiedCount = await expirePendingOrders();
          console.log(`[Server] Successfully expired ${modifiedCount} pending orders`);
        } catch (error) {
          console.error("[Server] Failed to expire pending orders:", error);
        }
      }, intervalMs);
      console.log(`[Server] Scheduled expirePendingOrders to run every ${intervalMinutes} minutes`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // Exit if DB connection fails on startup
  });
// --- End Database Connection ---

// Optional: Add global error handler, unhandled rejection/exception handlers
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1); // Mandatory exit after uncaught exception
});