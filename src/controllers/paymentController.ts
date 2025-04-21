// src/controllers/paymentController.ts
import { Request, Response } from "express";
import { Connection } from "@solana/web3.js";
import Order from "../models/Order";

export const verifySolanaPayment = async (req: Request, res: Response): Promise<void> => {
  const { signature, orderId } = req.body;
  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL!, "confirmed");
    const tx = await connection.getTransaction(signature, { commitment: "confirmed" });
    if (!tx) {
      res.status(400).json({ error: "Transaction not found" });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const expectedLamports = order.total * 1_000_000_000;
    // Add more verification logic as needed

    order.paymentSignature = signature;
    order.status = "completed";
    await order.save();

    res.json({ message: "Payment verified", order });
  } catch (error) {
    res.status(500).json({ error: "Verification failed" });
  }
};

export const verifyPiPayment = async (req: Request, res: Response): Promise<void> => {
  const { paymentId, orderId } = req.body;
  try {
    // Placeholder: Verify with Pi Network API
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    order.paymentSignature = paymentId;
    order.status = "completed";
    await order.save();

    res.json({ message: "Pi payment verified", order });
  } catch (error) {
    res.status(500).json({ error: "Pi payment verification failed" });
  }
};