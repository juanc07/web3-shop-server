// src/routes/userRoutes.ts
import express from "express";
import { Request, Response } from "express";
import { register, login, promote, demote } from "../controllers/authController";
import { authenticate, restrictTo, authenticateAdmin } from "../middleware/auth"; // Import necessary middleware
import User, { IUser } from "../models/User"; // <--- IMPORT IUser
import mongoose from 'mongoose';

const router = express.Router();

// Remove the local AuthenticatedRequest interface, use global augmentation instead

router.post("/register", register); // Assuming controller handles async/res
router.post("/login", login); // Assuming controller handles async/res

// Profile Route - Use global Request type
router.get("/profile", authenticate, (req: Request, res: Response): void => { // req is now Express.Request augmented with user?
  if (!req.user) {
     // Should be caught by authenticate, but defensive check is okay
     res.status(401).json({ message: "Not authenticated (user data missing)" });
     return;
  }
  // req.user here is { id: string, role: string } from the JWT
  res.json(req.user);
});

// Get All Users Route - Use global Request type, fix mapping
router.get("/all", authenticate, restrictTo("admin"), async (req: Request, res: Response): Promise<void> => {
  try {
    // Use .lean() for plain objects, type the result
    const users: IUser[] = await User.find().select("-password").lean();

    // Explicitly type 'u' as IUser in the map function
    const normalizedUsers = users.map((u: IUser) => {
        // Robust ID conversion
        const id = u._id instanceof mongoose.Types.ObjectId ? u._id.toString() : String(u._id);
        return {
            id: id, // Use converted ID
            email: u.email,
            name: u.name,
            role: ["buyer", "seller", "admin"].includes(u.role) ? u.role : "buyer", // Ensure role is valid
        };
    });
    // Send response, DO NOT RETURN IT
    res.json(normalizedUsers); // <--- CORRECT
  } catch (error) {
      console.error("Error fetching all users:", error);
      // Send error response, DO NOT RETURN IT
      res.status(500).json({ message: "Failed to fetch users" }); // <--- CORRECT
  }
});


// Promote/Demote Routes
router.post("/promote", authenticateAdmin, promote); // Use appropriate admin auth
router.post("/demote", authenticateAdmin, demote); // Use appropriate admin auth

export default router;