// src/controllers/productImageController.ts (Simplified Example)
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Product, { IProduct } from "../models/Product"; // Import IProduct
import fs from "fs/promises";
import { asyncHandler } from "../utils/asyncHandler"; // Assuming you have this helper
import { getConfig } from "../config"; // Assuming config loads Cloudinary details

// Import and configure Cloudinary (place config logic here or in a separate config file)
const cloudinary = require("cloudinary").v2;
const config = getConfig();
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

console.log("Cloudinary configured for product images."); // Verify config loads

interface MulterRequest extends Request {
    file?: Express.Multer.File;
    // Add user property if attached by auth middleware
    user?: { id: string; role: string };
    // Define specific params expected
    params: { productId: string };
}


// --- Upload/Replace Product Image ---
export const uploadOrReplaceProductImage = asyncHandler(
  async (req: MulterRequest, res: Response, next: NextFunction): Promise<void> => {
      const { productId } = req.params;
      const userId = req.user?.id; // Assuming authenticate middleware attaches user

      console.log(`Uploading image for product: ${productId} by user: ${userId}`);

      if (!req.file) {
          res.status(400).json({ message: "No image file provided." });
          return;
      }
      if (!mongoose.Types.ObjectId.isValid(productId)) {
          res.status(400).json({ message: "Invalid product ID format." });
          return;
      }
      if (!userId) {
           res.status(401).json({ message: "Authentication required." });
           return;
      }


      try {
          const product = await Product.findById(productId);
          if (!product) {
              res.status(404).json({ message: "Product not found." });
              return;
          }

          // Authorization: Ensure user owns the product or is admin
          if (product.seller.toString() !== userId && req.user?.role !== 'admin') {
               res.status(403).json({ message: "Forbidden: You cannot modify this product's image." });
               return;
          }

          // --- Delete Old Image from Cloudinary (if exists) ---
          if (product.imagePublicId) {
              console.log(`Deleting old image: ${product.imagePublicId}`);
              await cloudinary.uploader.destroy(product.imagePublicId);
              console.log(`Old image ${product.imagePublicId} deleted.`);
          }

          // --- Upload New Image to Cloudinary ---
          console.log(`Uploading new image from path: ${req.file.path}`);
          const result = await cloudinary.uploader.upload(req.file.path, {
              folder: "online_shop_products", // Choose a suitable folder name
              // Consider using product ID for uniqueness if desired
              // public_id: `product_${productId}_${Date.now()}`,
              overwrite: true, // Overwrite if somehow same public_id was used (less likely with unique IDs)
          });
          console.log("Cloudinary upload successful:", result.public_id);

          // --- Update Product Document ---
          product.imagePublicId = result.public_id;
          product.imageUrl = result.secure_url;
          await product.save();
          console.log(`Product ${productId} updated with new image.`);

          // Send response
          res.status(200).json({
              message: "Image updated successfully",
              imagePublicId: result.public_id,
              imageUrl: result.secure_url,
          });

      } catch (error) {
          console.error("Error uploading product image:", error);
          res.status(500).json({ message: "Image upload failed.", details: error instanceof Error ? error.message : "Unknown error" });
      } finally {
          // --- Clean up temporary file ---
          if (req.file?.path) {
              try {
                  await fs.unlink(req.file.path);
                  console.log(`Deleted temp file: ${req.file.path}`);
              } catch (unlinkError) {
                  console.error(`Error deleting temp file ${req.file.path}:`, unlinkError);
              }
          }
      }
  }
);

 // --- Delete Product Image ---
 export const deleteProductImage = asyncHandler(
  async (req: MulterRequest, res: Response, next: NextFunction): Promise<void> => {
      // Similar logic: find product, authorize, delete from cloudinary, update DB
      const { productId } = req.params;
      const userId = req.user?.id;
       console.log(`Deleting image for product: ${productId} by user: ${userId}`);
      // ... (validation & authorization checks) ...
      try {
           const product = await Product.findById(productId);
            // ... (check if product exists, user is owner/admin) ...

             if (!product || !product.imagePublicId) {
                  res.status(404).json({ message: "Product or image not found." });
                  return;
              }
              if (product.seller.toString() !== userId && req.user?.role !== 'admin') {
                   res.status(403).json({ message: "Forbidden: You cannot modify this product's image." });
                   return;
              }

               await cloudinary.uploader.destroy(product.imagePublicId);
               console.log(`Deleted image ${product.imagePublicId} from Cloudinary.`);

              product.imagePublicId = undefined;
              product.imageUrl = undefined;
              await product.save();
               console.log(`Image fields cleared for product ${productId}.`);

              res.status(200).json({ message: "Image deleted successfully" });

      } catch(error){
           console.error("Error deleting product image:", error);
           res.status(500).json({ message: "Image deletion failed.", details: error instanceof Error ? error.message : "Unknown error" });
      }

  }
);