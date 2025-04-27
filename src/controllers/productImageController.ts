// src/controllers/productImageController.ts
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Product, { IProduct } from "../models/Product";
import fs from "fs/promises";
import { asyncHandler } from "../utils/asyncHandler";
import { getConfig } from "../config";

const cloudinary = require("cloudinary").v2;
const config = getConfig();
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

console.log("Cloudinary configured for product images.");

interface MulterRequest extends Request {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  user?: { id: string; role: string };
  params: { productId: string; publicId?: string };
}

// Upload Multiple Product Images
export const uploadProductImages = asyncHandler(
  async (req: MulterRequest, res: Response, next: NextFunction): Promise<void> => {
    const { productId } = req.params;
    const userId = req.user?.id;
    console.log(`Uploading images for product: ${productId} by user: ${userId}`);

    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      res.status(400).json({ message: "No image files provided." });
      return;
    }
    const files = Array.isArray(req.files) ? req.files : req.files["images"];
    if (!files || files.length > 6) {
      res.status(400).json({ message: "Cannot upload more than 6 images." });
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

      if (product.seller.toString() !== userId && req.user?.role !== "admin") {
        res.status(403).json({ message: "Forbidden: You cannot modify this product's images." });
        return;
      }

      // Check total images (existing + new)
      const currentImageCount = product.images?.length || 0;
      if (currentImageCount + files.length > 6) {
        res.status(400).json({ message: `Cannot exceed 6 images. Currently ${currentImageCount} images, attempted to add ${files.length}.` });
        return;
      }

      // Upload new images to Cloudinary
      const uploadPromises = files.map(async (file) => {
        console.log(`Uploading image from path: ${file.path}`);
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "online_shop_products",
          overwrite: true,
        });
        return { url: result.secure_url, publicId: result.public_id };
      });

      const newImages = await Promise.all(uploadPromises);
      console.log(`Uploaded ${newImages.length} images to Cloudinary.`);

      // Update product with new images
      product.images = [...(product.images || []), ...newImages];
      await product.save();
      console.log(`Product ${productId} updated with new images.`);

      res.status(200).json({
        message: "Images uploaded successfully",
        images: newImages,
      });
    } catch (error) {
      console.error("Error uploading product images:", error);
      res.status(500).json({ message: "Image upload failed.", details: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      // Clean up temporary files
      if (req.files) {
        const filesToDelete = Array.isArray(req.files) ? req.files : req.files["images"] || [];
        for (const file of filesToDelete) {
          try {
            await fs.unlink(file.path);
            console.log(`Deleted temp file: ${file.path}`);
          } catch (unlinkError) {
            console.error(`Error deleting temp file ${file.path}:`, unlinkError);
          }
        }
      }
    }
  }
);

// Delete Specific Product Image
export const deleteProductImage = asyncHandler(
  async (req: MulterRequest, res: Response, next: NextFunction): Promise<void> => {
    const { productId, publicId } = req.params;
    const userId = req.user?.id;
    console.log(`Deleting image ${publicId} for product: ${productId} by user: ${userId}`);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ message: "Invalid product ID format." });
      return;
    }
    if (!publicId) {
      res.status(400).json({ message: "Image public ID is required." });
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

      if (product.seller.toString() !== userId && req.user?.role !== "admin") {
        res.status(403).json({ message: "Forbidden: You cannot modify this product's images." });
        return;
      }

      if (!product.images || !product.images.some((img: { url: string; publicId: string }) => img.publicId === publicId)) {
        res.status(404).json({ message: "Image not found for this product." });
        return;
      }

      // Delete from Cloudinary
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted image ${publicId} from Cloudinary.`);

      // Remove image from product
      product.images = product.images.filter((img: { url: string; publicId: string }) => img.publicId !== publicId);
      await product.save();
      console.log(`Image ${publicId} removed from product ${productId}.`);

      res.status(200).json({ message: "Image deleted successfully" });
    } catch (error) {
      console.error("Error deleting product image:", error);
      res.status(500).json({ message: "Image deletion failed.", details: error instanceof Error ? error.message : "Unknown error" });
    }
  }
);