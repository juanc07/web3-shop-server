// src/routes/productRoutes.ts
import express from "express";
import { Request, Response } from "express";
import { authenticate, restrictTo } from "../middleware/auth";
import Product from "../models/Product"; // Assuming Product model handles population types

// Remove the local AuthenticatedRequest interface

const router = express.Router();

// GET / - Get all products (Public)
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find().populate("seller", "name email"); // Populate necessary seller fields
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Failed to retrieve products" });
  }
});

// GET /:id - Get single product (Public)
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id).populate("seller", "name email");
    if (!product) {
      res.status(404).json({ message: "Product not found" }); // Use message for consistency
      return;
    }
    res.json(product);
  } catch (error) {
    // Handle potential CastError if ID format is invalid
    if (error instanceof Error && error.name === 'CastError') {
         res.status(400).json({ message: "Invalid product ID format" });
    } else {
        console.error("Error fetching product by ID:", error);
        res.status(500).json({ message: "Failed to retrieve product" });
    }
  }
});

// POST / - Create product (Seller only)
router.post("/", authenticate, restrictTo("seller"), async (req: Request, res: Response): Promise<void> => {
  try {
    // req.user guaranteed by middleware chain if next() was called
    if (!req.user) {
        res.status(401).json({ message: "Authentication required." });
        return;
    }
    const { name, description, price, stock } = req.body;
    const product = new Product({
      name,
      description,
      price,
      stock,
      seller: req.user.id, // Use ID from authenticated user
    });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
      // Add more specific error handling (e.g., validation errors) if needed
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
  }
});

// GET /my-products - Get seller's products (Seller only)
router.get("/my-products", authenticate, restrictTo("seller"), async (req: Request, res: Response): Promise<void> => {
  try {
    // req.user guaranteed by middleware chain
    if (!req.user) {
        res.status(401).json({ message: "Authentication required." });
        return;
    }
    const products = await Product.find({ seller: req.user.id });
    res.json(products);
  } catch (error) {
    console.error("Error fetching seller products:", error);
    res.status(500).json({ message: "Failed to retrieve seller products" });
  }
});

// DELETE /:id - Delete product (Admin only)
router.delete("/:id", authenticate, restrictTo("admin"), async (req: Request, res: Response): Promise<void> => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
        res.status(404).json({ message: "Product not found for deletion" });
        return;
    }
    res.json({ message: "Product deleted successfully" }); // Provide clearer success message
  } catch (error) {
    // Handle potential CastError if ID format is invalid
    if (error instanceof Error && error.name === 'CastError') {
         res.status(400).json({ message: "Invalid product ID format for deletion" });
    } else {
        console.error("Error deleting product:", error);
        res.status(500).json({ message: "Failed to delete product" });
    }
  }
});

export default router;