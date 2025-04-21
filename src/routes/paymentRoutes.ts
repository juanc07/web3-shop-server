// src/routes/paymentRoutes.ts
import express from "express";
import { verifySolanaPayment, verifyPiPayment } from "../controllers/paymentController";

const router = express.Router();

router.post("/verify-solana", verifySolanaPayment);
router.post("/verify-pi", verifyPiPayment);

export default router;