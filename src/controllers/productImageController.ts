// src/controllers/productImageController.ts
import { Request, Response, NextFunction, Express } from "express"; // Added Express import
import cloudinary from "cloudinary";
import Product, { IProduct } from "../models/Product";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from "mongoose";

interface MulterRequest extends Request {
  file?: Express.Multer.File; // Changed to Express.Multer.File
  user?: { id: string; roles: string[] };
}

export const uploadImage = asyncHandler<MulterRequest>(
  async (req: MulterRequest, res: Response, next: NextFunction): Promise<void> => {
    const { productId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No image file uploaded" });
      return;
    }

    const product: IProduct | null = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    if (!req.user?.roles.includes("seller") && !req.user?.roles.includes("admin")) {
      res.status(403).json({ message: "Only sellers or admins can upload images" });
      return;
    }

    const result = await cloudinary.v2.uploader.upload(req.file.path, {
      folder: "products",
    });

    product.images = product.images || [];
    product.images.push({ url: result.secure_url, publicId: result.public_id });
    await product.save();

    res.json({ message: "Image uploaded successfully", image: { url: result.secure_url, publicId: result.public_id } });
  }
);

export const deleteImage = asyncHandler<MulterRequest>(
  async (req: MulterRequest, res: Response, next: NextFunction): Promise<void> => {
    const { productId, publicId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const product: IProduct | null = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    if (!req.user?.roles.includes("seller") && !req.user?.roles.includes("admin")) {
      res.status(403).json({ message: "Only sellers or admins can delete images" });
      return;
    }

    if (!product.images?.some((img) => img.publicId === publicId)) {
      res.status(404).json({ message: "Image not found in product" });
      return;
    }

    await cloudinary.v2.uploader.destroy(publicId);
    product.images = product.images?.filter((img) => img.publicId !== publicId);
    await product.save();

    res.json({ message: "Image deleted successfully" });
  }
);