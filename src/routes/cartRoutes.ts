// src/routes/cartRoutes.ts
import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Cart from "../models/Cart";
import Product from "../models/Product";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";

interface AddCartRequestBody {
  productId: string;
  quantity: number;
}

interface AuthenticatedRequest extends Request<{}, {}, AddCartRequestBody> {
  user?: { id: string; roles: string[] };
}

interface RemoveCartRequest extends Request<{ productId: string }, {}, {}> {
  user?: { id: string; roles: string[] };
}

const router = express.Router();

router.get(
  "/",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart) {
      res.json({ items: [] });
      return;
    }

    res.json(cart);
  })
);

router.post(
  "/add",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const { productId, quantity } = req.body;
    const userId = req.user?.id;

    console.log("Cart: Adding to cart:", { productId, quantity, userId });

    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: "Invalid quantity." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    if (product.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock." });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: new mongoose.Types.ObjectId(productId), quantity });
    }

    await cart.save();
    console.log("Cart: Item added:", cart);
    res.status(200).json({ message: "Item added to cart.", cart });
  })
);

router.delete(
  "/remove/:productId",
  authenticate,
  asyncHandler<RemoveCartRequest>(async (req: RemoveCartRequest, res: Response) => {
    const { productId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    await cart.save();

    res.status(200).json({ message: "Item removed from cart.", cart });
  })
);

export default router;