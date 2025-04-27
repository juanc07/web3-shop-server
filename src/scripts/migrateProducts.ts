// src/scripts/migrateProducts.ts
import mongoose from 'mongoose';
import Product from '../models/Product';
import { getConfig } from '../config';

async function migrateProducts() {
  try {
    const config = getConfig();
    await mongoose.connect(config.MONGO_URI);
    console.log('Connected to MongoDB');

    // Set solPrice and piPrice for products missing these fields
    await Product.updateMany(
      { solPrice: { $exists: false } },
      { $set: { solPrice: 0, piPrice: 0 } }
    );

    // Apply conversion rates (e.g., 1 USDC = 0.01 SOL, 1 USDC = 10 Pi)
    const products = await Product.find();
    for (const product of products) {
      product.solPrice = product.price * 0.01; // 1 USDC = 0.01 SOL
      product.piPrice = product.price * 10;    // 1 USDC = 10 Pi
      await product.save();
    }

    console.log('Migration completed');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateProducts();