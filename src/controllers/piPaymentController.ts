// src/controllers/piPaymentController.ts
import { Request, Response } from "express";
import Order from "../models/Order";

export const verifyPiPayment = async (req: Request, res: Response) => {
  const { paymentId, orderId } = req.body;
  try {
    // Placeholder: Verify with Pi Network API
    // const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
    //   headers: { Authorization: `Bearer ${process.env.PI_API_KEY}` },
    // });
    // const payment = await response.json();

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.paymentSignature = paymentId;
    order.status = "completed";
    await order.save();

    res.json({ message: "Pi payment verified", order });
  } catch (error) {
    res.status(500).json({ error: "Pi payment verification failed" });
  }
};