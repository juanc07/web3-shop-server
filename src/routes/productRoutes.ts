// src/routes/productRoutes.ts
import express from "express";
import { Request, Response } from "express";
import { authenticate, restrictTo } from "../middleware/auth"; // Your auth middleware
import Product from "../models/Product";
import mongoose from 'mongoose';
import multer from 'multer';
import * as productImageController from '../controllers/productImageController'; // Import the controller

// --- Multer Setup ---
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
          cb(null, true);
      } else {
          cb(new Error('File upload failed: Only image files are allowed.') as any, false);
      }
  }
});
// --- End Multer Setup ---

const router = express.Router();

// ==================================================
// Specific Routes (Define BEFORE parameterized routes)
// ==================================================

// GET /api/products/my-products - Get seller's products
router.get("/my-products", authenticate, restrictTo("seller"), async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Backend: GET /api/products/my-products hit");
    if (!req.user || !req.user.id) {
        // FIX: Remove return
        res.status(401).json({ message: "Authentication required." }); return; // Keep return here to stop execution
    }
    const products = await Product.find({ seller: req.user.id }).sort({ createdAt: -1 });
    console.log(`Backend: Found ${products.length} products for seller ${req.user.id}`);
    res.json(products); // Send response
  } catch (error) {
    console.error("Backend Error fetching seller products:", error);
    res.status(500).json({ message: "Failed to retrieve seller products" }); // Send error response
  }
});


// ==================================================
// General Public Routes
// ==================================================

// GET /api/products - Get all products (Public)
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Backend: GET /api/products (all) hit");
    const products = await Product.find().populate("seller", "name email").sort({ createdAt: -1 });
    console.log(`Backend: Found ${products.length} total products`);
    res.json(products); // Send response
  } catch (error) {
    console.error("Backend Error fetching all products:", error);
    res.status(500).json({ message: "Failed to retrieve products" }); // Send error response
  }
});


// ==================================================
// Parameterized Routes (Define AFTER specific routes)
// ==================================================

// GET /api/products/:id - Get single product (Public)
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;
    console.log(`Backend: GET /api/products/:id hit with ID: ${productId}`);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        console.log("Backend: Invalid ObjectId format for ID:", productId);
        // FIX: Remove return
        res.status(400).json({ message: "Invalid product ID format" }); return; // Keep return here
    }

    const product = await Product.findById(productId).populate("seller", "name email");
    if (!product) {
      console.log("Backend: Product not found for ID:", productId);
       // FIX: Remove return
      res.status(404).json({ message: "Product not found" }); return; // Keep return here
    }
    console.log("Backend: Found product:", product.name);
    res.json(product); // Send response
  } catch (error) {
    console.error(`Backend Error fetching product by ID ${req.params.id}:`, error);
    res.status(500).json({ message: "Failed to retrieve product" }); // Send error response
  }
});

// POST /api/products - Create new product (Seller only)
router.post("/", authenticate, restrictTo("seller"), async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Backend: POST /api/products hit");
    if (!req.user) {
        res.status(401).json({ message: "Authentication required." }); return; // Keep return here
    }
    const { name, description, price, stock } = req.body;
    if (!name || !description || price == null || stock == null || price <= 0 || stock < 0 || !Number.isInteger(stock)) {
         res.status(400).json({ message: "Invalid product data provided (name, desc, positive price, non-negative integer stock required)." }); return; // Keep return here
    }

    const product = new Product({
      name: String(name).trim(),
      description: String(description).trim(),
      price: Number(price),
      stock: Number(stock),
      seller: req.user.id,
    });
    await product.save();
    console.log("Backend: Product created (without image):", product._id);
    res.status(201).json(product); // Send response
  } catch (error) {
      console.error("Backend Error creating product:", error);
      if (error instanceof mongoose.Error.ValidationError) {
          res.status(400).json({ message: "Product validation failed", errors: error.errors }); // Send error response
      } else {
          res.status(500).json({ message: "Failed to create product" }); // Send error response
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
      // FIX: Remove return
      res.status(400).json({ message: "Invalid product ID format" }); return; // Keep return here
    }
    if (!userId) {
       // FIX: Remove return
       res.status(401).json({ message: "Authentication required." }); return; // Keep return here
    }
    if (!name || !description || price == null || stock == null || price <= 0 || stock < 0 || !Number.isInteger(stock)) {
        // FIX: Remove return
        res.status(400).json({ message: "Invalid product data provided for update (name, desc, positive price, non-negative integer stock required)." }); return; // Keep return here
    }

    const product = await Product.findById(productId);
    if (!product) {
       // FIX: Remove return
      res.status(404).json({ message: "Product not found" }); return; // Keep return here
    }

    const isSellerOwner = product.seller?.toString() === userId;
    const isAdmin = req.user?.role === 'admin';
    if (!isSellerOwner && !isAdmin) {
        // FIX: Remove return
        res.status(403).json({ message: "Forbidden: You cannot update this product." }); return; // Keep return here
    }

    product.name = String(name).trim();
    product.description = String(description).trim();
    product.price = Number(price);
    product.stock = Number(stock);

    const updatedProduct = await product.save();
    console.log(`Backend: Product updated: ${productId}`);
    res.json(updatedProduct); // Send response

  } catch (error) {
    console.error(`Backend Error updating product ${req.params.id}:`, error);
     if (error instanceof mongoose.Error.ValidationError) {
         res.status(400).json({ message: "Product validation failed", errors: error.errors }); // Send error response
     } else {
         res.status(500).json({ message: "Failed to update product" }); // Send error response
     }
  }
});


// POST /api/products/:productId/image - Upload/Replace Product Image
router.post(
    "/:productId/image",
    authenticate,
    upload.single("image"),
    productImageController.uploadOrReplaceProductImage
);


// DELETE /api/products/:productId/image - Delete Product Image
router.delete(
    "/:productId/image",
    authenticate,
    productImageController.deleteProductImage
);


// DELETE /api/products/:id - Delete entire product
router.delete("/:id", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;
    console.log(`Backend: DELETE /api/products/:id hit with ID: ${productId}`);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        // FIX: Remove return
        res.status(400).json({ message: "Invalid product ID format for deletion" }); return; // Keep return here
    }
    if (!req.user) {
         // FIX: Remove return
         res.status(401).json({ message: "Authentication required." }); return; // Keep return here
    }

    const product = await Product.findById(productId);
    if (!product) {
        // FIX: Remove return
        res.status(404).json({ message: "Product not found for deletion" }); return; // Keep return here
    }

    const isSellerOwner = product.seller?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isSellerOwner && !isAdmin) {
         console.log(`Backend: Unauthorized delete attempt by user ${req.user.id} (role: ${req.user.role}) for product ${productId} owned by ${product.seller}`);
          // FIX: Remove return
         res.status(403).json({ message: "Forbidden: You do not have permission to delete this product." }); return; // Keep return here
    }

    if (product.imagePublicId) {
        try {
            console.log(`Attempting to delete image ${product.imagePublicId} from Cloudinary before product deletion.`);
            const cloudinary = require("cloudinary").v2; // Require here or ensure configured globally
            await cloudinary.uploader.destroy(product.imagePublicId);
            console.log(`Cloudinary image ${product.imagePublicId} deleted.`);
        } catch (imgDelError) {
            console.error(`Failed to delete Cloudinary image ${product.imagePublicId} during product deletion:`, imgDelError);
        }
    }

    await Product.findByIdAndDelete(productId);
    console.log(`Backend: Product deleted successfully: ${productId}`);
    res.json({ message: "Product deleted successfully" }); // Send response
  } catch (error) {
    console.error(`Backend Error deleting product ${req.params.id}:`, error);
    res.status(500).json({ message: "Failed to delete product" }); // Send error response
  }
});


export default router;