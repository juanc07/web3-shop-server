// src/routes/productRoutes.ts
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import multer, { FileFilterCallback } from "multer";
import Product, { IProduct } from "../models/Product";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, restrictTo } from "../middleware/auth";
import { uploadImage, deleteImage } from "../controllers/productImageController";
import { getConfig } from "../config";

const config = getConfig();

interface ProductRequestBody {
  name: string;
  description: string;
  price: number;
  solPrice: number;
  piPrice: number;
  stock: number;
}

interface AuthenticatedRequest<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  Locals extends Record<string, any> = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery, Locals> {
  user?: { id: string; roles: string[] };
}

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed") as any, false); // Type assertion to bypass TS2345
    }
    cb(null, true);
  },
  limits: { fileSize: config.MAX_IMAGE_SIZE_MB * 1024 * 1024 }, // 25MB limit
});

// Get all products
router.get(
  "/",
  asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const products = await Product.find().populate("seller", "username");
    res.json(products);
  })
);

// Get single product
router.get(
  "/:id",
  asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid product ID" });
      return;
    }

    const product = await Product.findById(id).populate("seller", "username");
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json(product);
  })
);

// Create product (restricted to sellers)
router.post(
  "/",
  authenticate,
  restrictTo("seller"),
  asyncHandler<AuthenticatedRequest<{}, {}, ProductRequestBody>>(
    async (req: AuthenticatedRequest<{}, {}, ProductRequestBody>, res: Response) => {
      const { name, description, price, solPrice, piPrice, stock } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      if (!name || !description || price == null || solPrice == null || piPrice == null || stock == null) {
        res.status(400).json({ message: "All fields (name, description, price, solPrice, piPrice, stock) are required" });
        return;
      }

      const product = new Product({
        name,
        description,
        price,
        solPrice,
        piPrice,
        stock,
        seller: userId,
      });

      await product.save();
      res.status(201).json(product);
    }
  )
);

// Update product (restricted to seller or admin)
router.put(
  "/:id",
  authenticate,
  asyncHandler<AuthenticatedRequest<{ id: string }, {}, ProductRequestBody>>(
    async (req: AuthenticatedRequest<{ id: string }, {}, ProductRequestBody>, res: Response) => {
      const { id } = req.params;
      const { name, description, price, solPrice, piPrice, stock } = req.body;
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

      const isAdmin = req.user?.roles.includes("admin");
      const isOwner = product.seller.toString() === userId;

      if (!isAdmin && !isOwner) {
        res.status(403).json({ message: "Unauthorized: Only the product owner or admin can update this product" });
        return;
      }

      if (name) product.name = name;
      if (description) product.description = description;
      if (price != null) product.price = price;
      if (solPrice != null) product.solPrice = solPrice;
      if (piPrice != null) product.piPrice = piPrice;
      if (stock != null) product.stock = stock;

      await product.save();
      res.json(product);
    }
  )
);

// Delete product (restricted to seller or admin)
router.delete(
  "/:id",
  authenticate,
  asyncHandler<AuthenticatedRequest<{ id: string }>>(
    async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
      const { id } = req.params;
      const userId = req.user?.id;
      const productId = id;

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

      const isAdmin = req.user?.roles.includes("admin");
      const isOwner = product.seller.toString() === userId;

      if (!isAdmin && !isOwner) {
        if (req.user) {
          console.log(
            `Backend: Unauthorized delete attempt by user ${req.user.id} (roles: ${req.user.roles.join(", ")}) for product ${productId} owned by ${product.seller}`
          );
        }
        res.status(403).json({ message: "Unauthorized: Only the product owner or admin can delete this product" });
        return;
      }

      await product.deleteOne();
      res.json({ message: "Product deleted successfully" });
    }
  )
);

// Image upload (restricted to seller or admin)
router.post(
  "/:id/images",
  authenticate,
  restrictTo("seller", "admin"),
  upload.array("images", 6),
  uploadImage
);

// Image delete (restricted to seller or admin)
router.delete(
  "/:id/images/:publicId",
  authenticate,
  restrictTo("seller", "admin"),
  deleteImage
);

export default router;