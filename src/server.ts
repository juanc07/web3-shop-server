// src/server.ts
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

// Route Imports
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import paymentRoutes from "./routes/paymentRoutes";

// Config Imports
// Assumes env.ts is run first via --require flag in package.json
import { getConfig } from "./config";

// --- Load and Validate Configuration ---
let config;
try {
  console.log("[Server] Loading configuration...");
  config = getConfig(); // Load and validate config from environment variables
  console.log("[Server] Configuration loaded successfully.");
  // Log non-sensitive config values for confirmation
  console.log(`[Server] Config - NODE_ENV: ${config.NODE_ENV}`);
  console.log(`[Server] Config - PORT: ${config.PORT}`);
  console.log(`[Server] Config - MONGO_URI: Loaded`); // Verified by getConfig
  console.log(`[Server] Config - JWT_SECRET: Loaded & Validated`); // Verified by getConfig
  console.log(`[Server] Config - CLOUDINARY_CLOUD_NAME: Loaded`); // Verified by getConfig
  console.log(`[Server] Config - SOLANA_NETWORK: ${config.SOLANA_NETWORK}`);
  console.log(`[Server] Config - SOLANA_RPC_URL: ${config.SOLANA_RPC_URL}`);
  console.log(`[Server] Config - FRONTEND_URL: ${config.FRONTEND_URL}`);
  console.log(`[Server] Config - API_KEY: Loaded`); // Verified by getConfig
  console.log(`[Server] Config - WEBSITE_WALLET: Loaded`); // Verified by getConfig

} catch (error) {
    console.error("🔴 FATAL ERROR: Failed to load or validate configuration.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1); // Exit if config loading/validation fails
}
// --- End Configuration Loading ---

// --- Initialize Express App ---
const app = express();
console.log("[Server] Setting up middleware...");
// Enable CORS - Configure allowed origins from config in production
app.use(cors(/* { origin: config.FRONTEND_URL } */)); // Example using FRONTEND_URL
// Enable JSON body parsing
app.use(express.json());
console.log("[Server] Middleware set up.");
// --- End Middleware Setup ---


// --- Setup API Routes ---
// Optional: Add API Key middleware if needed for all routes or specific ones
// const apiKeyMiddleware = (req, res, next) => { ... check config.API_KEY ... };
// app.use('/api', apiKeyMiddleware); // Apply to all /api routes

console.log("[Server] Setting up API routes...");
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
console.log("[Server] API routes set up.");
// --- End Route Setup ---


// --- Database Connection ---
console.log(`[Server] Attempting to connect to MongoDB at ${config.MONGO_URI ? 'URI provided' : 'URI MISSING!'}`);
mongoose.connect(config.MONGO_URI) // Use MONGO_URI from the validated config object
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
      console.error("❌ MongoDB connection error:", err);
      process.exit(1); // Exit if DB connection fails on startup
  });
// --- End Database Connection ---


// --- Start HTTP Server ---
const PORT = config.PORT; // Use PORT from the validated config object
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} [${config.NODE_ENV}]`));
// --- End Start Server ---

// Optional: Add global error handler, unhandled rejection/exception handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1); // Mandatory exit after uncaught exception
});