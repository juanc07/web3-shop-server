// src/controllers/productImageController.ts
import { Request, Response, NextFunction } from "express";
import cloudinary from "cloudinary";
import Product, { IProduct } from "../models/Product";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from "mongoose";
import fs from "fs";

interface MulterRequest extends Request {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] }; // Match Multer's type
  user?: { id: string; roles: string[] };
}

export const uploadImage = asyncHandler(
  async (req: MulterRequest, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Handle req.files as File[] for upload.array
    const files = Array.isArray(req.files) ? req.files : req.files ? req.files["images"] : [];
    if (!files || files.length === 0) {
      console.log("No files uploaded in request");
      res.status(400).json({ message: "No image files uploaded" });
      return;
    }

    console.log("Uploading files:", files.map((f) => f.originalname));

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid product ID" });
      return;
    }

    const product: IProduct | null = await Product.findById(id);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    if (!req.user?.roles.includes("seller") && !req.user?.roles.includes("admin")) {
      res.status(403).json({ message: "Only sellers or admins can upload images" });
      return;
    }

    product.images = product.images || [];
    const uploadedImages: { url: string; publicId: string }[] = [];

    for (const file of files) {
      try {
        const result = await cloudinary.v2.uploader.upload(file.path, {
          folder: "products",
          public_id: `${id}_${Date.now()}_${file.originalname}`,
        });
        product.images.push({ url: result.secure_url, publicId: result.public_id });
        uploadedImages.push({ url: result.secure_url, publicId: result.public_id });
      } catch (error) {
        console.error(`Cloudinary upload error for file ${file.originalname}:`, error);
        continue; // Skip failed uploads
      }
    }

    if (uploadedImages.length === 0) {
      res.status(500).json({ message: "Failed to upload any images" });
      return;
    }

    try {
      await product.save();
    } catch (error) {
      console.error("MongoDB save error:", error);
      res.status(500).json({ message: "Failed to save product with new images" });
      return;
    }

    // Clean up local files
    for (const file of files) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error(`Error deleting local file ${file.path}:`, error);
      }
    }

    res.json({
      message: "Images uploaded successfully",
      images: uploadedImages,
    });
  }
);

export const deleteImage = asyncHandler(
  async (req: MulterRequest, res: Response, next: NextFunction): Promise<void> => {
    const { id, publicId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid product ID" });
      return;
    }

    const product: IProduct | null = await Product.findById(id);
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

    try {
      await cloudinary.v2.uploader.destroy(publicId);
    } catch (error) {
      console.error("Cloudinary delete error:", error);
      res.status(500).json({ message: "Failed to delete image from Cloudinary" });
      return;
    }

    product.images = product.images?.filter((img) => img.publicId !== publicId);

    try {
      await product.save();
    } catch (error) {
      console.error("MongoDB save error:", error);
      res.status(500).json({ message: "Failed to save product after image deletion" });
      return;
    }

    res.json({ message: "Image deleted successfully" });
  }
);