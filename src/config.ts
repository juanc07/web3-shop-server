import { logInfo, logError } from "./utils/logger";

// Define the structure of your application configuration
interface Config {
  NODE_ENV: string;
  PORT: number;
  MONGO_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN_SECONDS: number;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  MAX_IMAGE_SIZE_MB: number;
  SUPERADMIN_EMAIL: string;
  // --- Added Variables ---
  SOLANA_NETWORK: 'devnet' | 'mainnet-beta' | 'testnet'; // Use specific types if known
  SOLANA_RPC_URL: string; // Added back as it's in .env
  FRONTEND_URL: string;
  API_KEY: string; // Assuming this is for securing API routes
  WEBSITE_WALLET: string; // Public key
  WEBSITE_WALLET_PRIVATE_KEY: string; // Private key (handle securely!)
}

export const getConfig = (): Config => {
  // env.ts should run first via --require in package.json
  // This ensures process.env is populated before this function runs.

  const nodeEnv = process.env.NODE_ENV || "development";

  // Read values from process.env with fallbacks (for non-required ones or defaults)
  const config: Omit<Config, 'NODE_ENV'> & { NODE_ENV: string } = { // Helper type
    NODE_ENV: nodeEnv,
    PORT: parseInt(process.env.PORT || "5000", 10),
    MONGO_URI: process.env.MONGO_URI || "", // Required, check below
    JWT_SECRET: process.env.JWT_SECRET || "", // Required, check below
    JWT_EXPIRES_IN_SECONDS: parseInt(process.env.JWT_EXPIRES_IN_SECONDS || '3600', 10),
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "", // Required
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "", // Required
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "", // Required
    MAX_IMAGE_SIZE_MB: parseInt(process.env.MAX_IMAGE_SIZE_MB || "5", 10),
    SUPERADMIN_EMAIL: process.env.SUPERADMIN_EMAIL || "admin@example.com", // Provide a default or make required
    // --- Added Variables ---
    SOLANA_NETWORK: (process.env.SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta' | 'testnet', // Default to devnet
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || "", // Required
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000", // Default for dev
    API_KEY: process.env.API_KEY || "", // Required
    WEBSITE_WALLET: process.env.WEBSITE_WALLET || "", // Required
    WEBSITE_WALLET_PRIVATE_KEY: process.env.WEBSITE_WALLET_PRIVATE_KEY || "", // Required
  };

  // --- Validation ---
  const requiredVars: Array<keyof Omit<Config, 'NODE_ENV'>> = [ // List required vars
    "MONGO_URI",
    "JWT_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "SOLANA_RPC_URL",
    "API_KEY",
    "WEBSITE_WALLET",
    "WEBSITE_WALLET_PRIVATE_KEY",
    // Add others like SUPERADMIN_EMAIL if it MUST be set
    "SUPERADMIN_EMAIL",
  ];

  const missingVars = requiredVars.filter(varName => !config[varName]);

  if (missingVars.length > 0) {
    const errorMsg = `Missing required environment variable(s): ${missingVars.join(", ")}. Please check your .env file.`;
    logError(errorMsg);
    throw new Error(errorMsg); // Stop server startup if required config is missing
  }

  // Specific Validations
  if (isNaN(config.PORT) || config.PORT <= 0 || config.PORT > 65535) {
      logError(`Invalid PORT value "${process.env.PORT}". Must be a number between 1 and 65535.`);
      throw new Error("Invalid PORT configuration.");
  }
  if (!config.JWT_SECRET || config.JWT_SECRET.length < 32) {
      logError("JWT_SECRET is missing or too short (minimum 32 characters required).");
      throw new Error("Invalid JWT_SECRET configuration.");
  }
  if (isNaN(config.JWT_EXPIRES_IN_SECONDS) || config.JWT_EXPIRES_IN_SECONDS <= 0) {
      logError(`Invalid JWT_EXPIRES_IN_SECONDS value "${process.env.JWT_EXPIRES_IN_SECONDS}". Must be a positive number.`);
      throw new Error("Invalid JWT_EXPIRES_IN_SECONDS configuration.");
  }
   if (isNaN(config.MAX_IMAGE_SIZE_MB) || config.MAX_IMAGE_SIZE_MB <= 0) {
      logError(`Invalid MAX_IMAGE_SIZE_MB value "${process.env.MAX_IMAGE_SIZE_MB}". Must be a positive number.`);
      throw new Error("Invalid MAX_IMAGE_SIZE_MB configuration.");
   }
   if (!['devnet', 'mainnet-beta', 'testnet'].includes(config.SOLANA_NETWORK)) {
      logError(`Invalid SOLANA_NETWORK value "${config.SOLANA_NETWORK}". Must be 'devnet', 'mainnet-beta', or 'testnet'.`);
      throw new Error("Invalid SOLANA_NETWORK configuration.");
   }
   // Basic check for Solana public key format (optional but good)
   if(config.WEBSITE_WALLET.length < 32 || config.WEBSITE_WALLET.length > 44){
      logError(`WEBSITE_WALLET (${config.WEBSITE_WALLET}) doesn't look like a valid Solana public key.`);
      // Maybe don't throw an error, but log a strong warning
   }
   // Add more specific validations as needed (e.g., URL format for RPC/Frontend)


  logInfo("Configuration loaded and validated successfully.");
  return config;
};