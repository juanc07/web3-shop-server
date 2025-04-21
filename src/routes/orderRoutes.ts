// src/routes/orderRoutes.ts
import express from "express";
import { Request, Response } from "express";
import { authenticate, restrictTo } from "../middleware/auth";
import Order from "../models/Order"; // Assuming Order model handles population types correctly

// Remove the local AuthenticatedRequest interface

const router = express.Router();

// POST / - Create Order (Might need authentication depending on your logic)
router.post("/", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { products, total, paymentMethod } = req.body;

    // Ensure user is attached by authenticate middleware
    if (!req.user || !req.user.id) {
        res.status(401).json({ message: "Authentication required to create an order." });
        return;
    }

    const order = new Order({
      user: req.user.id, // Use the authenticated user's ID
      products,
      total,
      paymentMethod,
    });
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Failed to create order" });
  }
});

// GET /my-orders - Get user's orders
router.get("/my-orders", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    // req.user is guaranteed by authenticate middleware if it calls next()
    // Non-null assertion (!) is okay here, or add another check if paranoid.
    if (!req.user) {
        res.status(401).json({ message: "Authentication required." });
        return;
    }
    const orders = await Order.find({ user: req.user.id }).populate("products.product");
    res.json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ message: "Failed to retrieve orders" });
  }
});

// GET / - Get all orders (Admin only)
router.get("/", authenticate, restrictTo("admin"), async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find().populate("user products.product");
    res.json(orders);
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({ message: "Failed to retrieve all orders" });
  }
});

export default router;