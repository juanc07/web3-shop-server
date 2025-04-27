// src/routes/userRoutes.ts
import express from "express";
import { Request, Response, NextFunction } from "express";
import mongoose, { Document } from "mongoose";
import {
  registerWithSolana,
  registerWithPi,
  updateProfile,
  promote,
  demote,
} from "../controllers/authController";
import { authenticate, restrictTo, authenticateAdmin } from "../middleware/auth";
import User, { IUser } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";

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

router.post("/register-solana", registerWithSolana);
router.post("/register-pi", registerWithPi);

router.patch(
  "/profile",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    await updateProfile(req, res);
  })
);

router.get(
  "/profile",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated (user data missing)" });
      return;
    }
    const user: (IUser & mongoose.Document) | null = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      mobileNumber: user.mobileNumber,
      roles: user.roles,
      solanaWallet: user.solanaWallet,
      piWallet: user.piWallet,
    });
  })
);

router.get(
  "/all",
  authenticate,
  restrictTo("admin"),
  asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const users: (IUser & mongoose.Document)[] = await User.find().select("-password").lean();
    const normalizedUsers = users.map((u: IUser & mongoose.Document) => ({
      id: u._id.toString(),
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      roles: u.roles,
    }));
    res.json(normalizedUsers);
  })
);

router.post("/promote", authenticateAdmin, promote);
router.post("/demote", authenticateAdmin, demote);

export default router;