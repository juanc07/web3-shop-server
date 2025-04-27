// src/routes/orderRoutes.ts
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order";
import Cart from "../models/Cart";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";

interface OrderRequestBody {
  products: { product: string; quantity: number }[];
  total: number;
  paymentMethod: "usdc" | "solana" | "pi";
}

interface AuthenticatedRequest extends Request<{}, {}, OrderRequestBody> {
  user?: { id: string; roles: string[] };
}

const router = express.Router();

router.post(
  "/",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const { products, total, paymentMethod } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }
    if (!products || !Array.isArray(products) || products.length === 0) {
      res.status(400).json({ message: "Products array is required." });
      return;
    }
    if (!total || typeof total !== "number" || total <= 0) {
      res.status(400).json({ message: "Invalid total amount." });
      return;
    }
    if (!["usdc", "solana", "pi"].includes(paymentMethod)) {
      res.status(400).json({ message: "Invalid payment method." });
      return;
    }

    for (const item of products) {
      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        res.status(400).json({ message: `Invalid product ID: ${item.product}` });
        return;
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        res.status(400).json({ message: `Invalid quantity for product ${item.product}` });
        return;
      }
    }

    const order = new Order({
      user: userId,
      products,
      total,
      paymentMethod,
      status: "pending",
    });
    await order.save();

    await Cart.findOneAndUpdate({ user: userId }, { items: [] });

    res.status(201).json(order);
  })
);

router.get(
  "/",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const orders = await Order.find({ user: userId }).populate("products.product");
    res.json(orders);
  })
);

export default router;