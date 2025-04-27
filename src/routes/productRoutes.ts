// src/routes/productRoutes.ts
import express from "express";
import { Request, Response } from "express";
import { authenticate, restrictTo } from "../middleware/auth";
import Product from "../models/Product";
import mongoose from "mongoose";
import multer from "multer";
import * as productImageController from "../controllers/productImageController";

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("File upload failed: Only image files are allowed.") as any, false);
    }
  },
});

const router = express.Router();

// GET /api/products/my-products - Get seller's products
router.get("/my-products", authenticate, restrictTo("seller"), async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Backend: GET /api/products/my-products hit");
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }
    const products = await Product.find({ seller: req.user.id }).sort({ createdAt: -1 });
    console.log(`Backend: Found ${products.length} products for seller ${req.user.id}`);
    res.json(products);
  } catch (error) {
    console.error("Backend Error fetching seller products:", error);
    res.status(500).json({ message: "Failed to retrieve seller products" });
  }
});

// GET /api/products - Get all products (Public)
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Backend: GET /api/products (all) hit");
    const products = await Product.find().populate("seller", "name email").sort({ createdAt: -1 });
    console.log(`Backend: Found ${products.length} total products`);
    res.json(products);
  } catch (error) {
    console.error("Backend Error fetching all products:", error);
    res.status(500).json({ message: "Failed to retrieve products" });
  }
});

// GET /api/products/:id - Get single product (Public)
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;
    console.log(`Backend: GET /api/products/:id hit with ID: ${productId}`);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.log("Backend: Invalid ObjectId format for ID:", productId);
      res.status(400).json({ message: "Invalid product ID format" });
      return;
    }

    const product = await Product.findById(productId).populate("seller", "name email");
    if (!product) {
      console.log("Backend: Product not found for ID:", productId);
      res.status(404).json({ message: "Product not found" });
      return;
    }
    console.log("Backend: Found product:", product.name);
    res.json(product);
  } catch (error) {
    console.error(`Backend Error fetching product by ID ${req.params.id}:`, error);
    res.status(500).json({ message: "Failed to retrieve product" });
  }
});

// POST /api/products - Create new product (Seller only)
router.post("/", authenticate, restrictTo("seller"), async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Backend: POST /api/products hit");
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }
    const { name, description, price, stock } = req.body;
    if (!name || !description || price == null || stock == null || price <= 0 || stock < 0 || !Number.isInteger(stock)) {
      res.status(400).json({ message: "Invalid product data provided (name, desc, positive price, non-negative integer stock required)." });
      return;
    }

    const product = new Product({
      name: String(name).trim(),
      description: String(description).trim(),
      price: Number(price),
      stock: Number(stock),
      seller: req.user.id,
      images: [], // Initialize empty images array
    });
    await product.save();
    console.log("Backend: Product created (without images):", product._id);
    res.status(201).json(product);
  } catch (error) {
    console.error("Backend Error creating product:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ message: "Product validation failed", errors: error.errors });
    } else {
      res.status(500).json({ message: "Failed to create product" });
    }
  }
});

// PUT /api/products/:id - Update product details (Seller owner or Admin)
router.put("/:id", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;
    const userId = req.user?.id;
    const { name, description, price, stock } = req.body;

    console.log(`Backend: PUT /api/products/:id hit with ID: ${productId}`);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ message: "Invalid product ID format" });
      return;
    }
    if (!userId) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }
    if (!name || !description || price == null || stock == null || price <= 0 || stock < 0 || !Number.isInteger(stock)) {
      res.status(400).json({ message: "Invalid product data provided for update (name, desc, positive price, non-negative integer stock required)." });
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    const isSellerOwner = product.seller?.toString() === userId;
    const isAdmin = req.user?.role === "admin";
    if (!isSellerOwner && !isAdmin) {
      res.status(403).json({ message: "Forbidden: You cannot update this product." });
      return;
    }

    product.name = String(name).trim();
    product.description = String(description).trim();
    product.price = Number(price);
    product.stock = Number(stock);

    const updatedProduct = await product.save();
    console.log(`Backend: Product updated: ${productId}`);
    res.json(updatedProduct);
  } catch (error) {
    console.error(`Backend Error updating product ${req.params.id}:`, error);
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ message: "Product validation failed", errors: error.errors });
    } else {
      res.status(500).json({ message: "Failed to update product" });
    }
  }
});

// POST /api/products/:productId/images - Upload multiple product images
router.post(
  "/:productId/images",
  authenticate,
  upload.array("images", 6), // Allow up to 6 images
  productImageController.uploadProductImages
);

// DELETE /api/products/:productId/images/:publicId - Delete specific product image
router.delete(
  "/:productId/images/:publicId",
  authenticate,
  productImageController.deleteProductImage
);

// DELETE /api/products/:id - Delete entire product
router.delete("/:id", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;
    console.log(`Backend: DELETE /api/products/:id hit with ID: ${productId}`);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ message: "Invalid product ID format for deletion" });
      return;
    }
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found for deletion" });
      return;
    }

    const isSellerOwner = product.seller?.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isSellerOwner && !isAdmin) {
      console.log(`Backend: Unauthorized delete attempt by user ${req.user.id} (role: ${req.user.role}) for product ${productId} owned by ${product.seller}`);
      res.status(403).json({ message: "Forbidden: You do not have permission to delete this product." });
      return;
    }

    if (product.images && product.images.length > 0) {
      try {
        console.log(`Attempting to delete ${product.images.length} images from Cloudinary before product deletion.`);
        const cloudinary = require("cloudinary").v2;
        for (const image of product.images) {
          await cloudinary.uploader.destroy(image.publicId);
          console.log(`Cloudinary image ${image.publicId} deleted.`);
        }
      } catch (imgDelError) {
        console.error(`Failed to delete Cloudinary images during product deletion:`, imgDelError);
      }
    }

    await Product.findByIdAndDelete(productId);
    console.log(`Backend: Product deleted successfully: ${productId}`);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(`Backend Error deleting product ${req.params.id}:`, error);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

export default router;