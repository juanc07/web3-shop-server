// src/routes/userRoutes.ts
import express from "express";
import { Request, Response } from "express";
import { register, login, promote, demote } from "../controllers/authController";
import { authenticate, restrictTo, authenticateAdmin } from "../middleware/auth";
import User, { IUser } from "../models/User";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
}

router.post("/register", register);
router.post("/login", login);

router.get(
  "/profile",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated (user data missing)" });
      return;
    }
    res.json(req.user);
  })
);

router.get(
  "/all",
  authenticate,
  restrictTo("admin"),
  asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res: Response) => {
    const users: IUser[] = await User.find().select("-password").lean();
    const normalizedUsers = users.map((u: IUser) => {
      const id = u._id instanceof mongoose.Types.ObjectId ? u._id.toString() : String(u._id);
      return {
        id,
        email: u.email,
        name: u.name,
        role: ["buyer", "seller", "admin"].includes(u.role) ? u.role : "buyer",
      };
    });
    res.json(normalizedUsers);
  })
);

router.post("/promote", authenticateAdmin, promote);
router.post("/demote", authenticateAdmin, demote);

export default router;