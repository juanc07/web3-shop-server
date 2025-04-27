// src/routes/paymentRoutes.ts
import { Router, Request, Response } from "express";
import { verifySolPaymentWithAmount, verifyUsdcPaymentWithAmount } from "../services/solanaService";
import { IOrder } from "../models/Order";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { asyncHandler } from "../utils/asyncHandler";
import Order from "../models/Order";
import { IUser } from "../models/User";

const router = Router();

interface VerifySolanaRequestBody {
  signature: string;
  orderId: string;
}

interface VerifyUsdcRequestBody {
  signature: string;
  orderId: string;
}

router.post(
  "/verify-solana",
  asyncHandler<Request<{}, {}, VerifySolanaRequestBody>>(
    async (req: Request<{}, {}, VerifySolanaRequestBody>, res: Response) => {
      try {
        const { signature, orderId } = req.body;
        console.log("Verifying Solana payment:", { signature, orderId });

        if (!signature || typeof signature !== "string" || !orderId || typeof orderId !== "string") {
          await Order.findByIdAndUpdate(orderId, { status: "failed" });
          return res.status(400).json({ error: "signature and orderId are required" });
        }

        const order = (await Order.findById(orderId).populate<{ user: IUser }>("user")) as (IOrder & {
          user: IUser;
        }) | null;

        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }

        if (order.paymentMethod !== "solana") {
          await Order.findByIdAndUpdate(orderId, { status: "failed" });
          return res.status(400).json({ error: "Order payment method is not Solana" });
        }

        if (!order.user || !order.user.solanaWallet) {
          await Order.findByIdAndUpdate(orderId, { status: "failed" });
          return res.status(400).json({ error: "User has no Solana wallet address" });
        }

        const requiredAmount = order.total * LAMPORTS_PER_SOL; // Total is in SOL
        const paymentValid = await verifySolPaymentWithAmount(
          signature,
          order.user.solanaWallet,
          requiredAmount
        );

        if (!paymentValid) {
          await Order.findByIdAndUpdate(orderId, { status: "failed" });
          return res.status(400).json({
            error: `Transaction does not contain valid SOL transfer of ${order.total} SOL from ${order.user.solanaWallet}`,
          });
        }

        order.status = "completed";
        order.paymentSignature = signature;
        await order.save();

        res.status(200).json({ message: "Payment verified successfully" });
      } catch (error) {
        console.error("Error verifying Solana payment:", error);
        await Order.findByIdAndUpdate(req.body.orderId, { status: "failed" });
        res.status(500).json({
          error: "Failed to verify payment",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  )
);

router.post(
  "/verify-usdc",
  asyncHandler<Request<{}, {}, VerifyUsdcRequestBody>>(
    async (req: Request<{}, {}, VerifyUsdcRequestBody>, res: Response) => {
      try {
        const { signature, orderId } = req.body;
        console.log("Verifying USDC payment:", { signature, orderId });

        if (!signature || typeof signature !== "string" || !orderId || typeof orderId !== "string") {
          await Order.findByIdAndUpdate(orderId, { status: "failed" });
          return res.status(400).json({ error: "signature and orderId are required" });
        }

        const order = (await Order.findById(orderId).populate<{ user: IUser }>("user")) as (IOrder & {
          user: IUser;
        }) | null;

        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }

        if (order.paymentMethod !== "usdc") {
          await Order.findByIdAndUpdate(orderId, { status: "failed" });
          return res.status(400).json({ error: "Order payment method is not USDC" });
        }

        if (!order.user || !order.user.solanaWallet) {
          await Order.findByIdAndUpdate(orderId, { status: "failed" });
          return res.status(400).json({ error: "User has no Solana wallet address" });
        }

        const requiredAmount = Math.round(order.total * 1_000_000); // Total in USDC, 6 decimals
        const paymentValid = await verifyUsdcPaymentWithAmount(
          signature,
          order.user.solanaWallet,
          requiredAmount
        );

        if (!paymentValid) {
          await Order.findByIdAndUpdate(orderId, { status: "failed" });
          return res.status(400).json({
            error: `Transaction does not contain valid USDC transfer of ${order.total} USDC from ${order.user.solanaWallet}`,
          });
        }

        order.status = "completed";
        order.paymentSignature = signature;
        await order.save();

        res.status(200).json({ message: "Payment verified successfully" });
      } catch (error) {
        console.error("Error verifying USDC payment:", error);
        await Order.findByIdAndUpdate(req.body.orderId, { status: "failed" });
        res.status(500).json({
          error: "Failed to verify payment",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  )
);

router.post(
  "/verify-pi",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { paymentId, orderId } = req.body;
      console.log("Verifying Pi payment:", { paymentId, orderId });

      if (!paymentId || !orderId) {
        await Order.findByIdAndUpdate(orderId, { status: "failed" });
        return res.status(400).json({ error: "paymentId and orderId are required" });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.paymentMethod !== "pi") {
        await Order.findByIdAndUpdate(orderId, { status: "failed" });
        return res.status(400).json({ error: "Order payment method is not Pi" });
      }

      // Placeholder: Implement Pi Network payment verification
      // Verify paymentId with Pi Network SDK or API
      console.log("Verifying Pi payment:", { paymentId, orderId, total: order.total });
      // Replace with actual verification logic (e.g., verifyPiPayment)

      order.status = "completed";
      order.paymentSignature = paymentId;
      await order.save();

      res.status(200).json({ message: "Pi payment verified successfully" });
    } catch (error) {
      console.error("Error verifying Pi payment:", error);
      await Order.findByIdAndUpdate(req.body.orderId, { status: "failed" });
      res.status(500).json({
        error: "Failed to verify Pi payment",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

export default router;