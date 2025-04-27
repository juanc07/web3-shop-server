// src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User, { IUser } from "../models/User";

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "admin@example.com";
const JWT_EXPIRES_IN_SECONDS: number = parseInt(process.env.JWT_EXPIRES_IN_SECONDS || "3600", 10);

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, role } = req.body;
  try {
    if (!email || !password || !name || !role) {
      res.status(400).json({ message: "Missing required fields (email, password, name, role)" });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      res.status(400).json({ message: "Invalid email format" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters long" });
      return;
    }
    const validRoles = ["buyer", "seller"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ message: "Invalid role. Registration only allowed for 'buyer' or 'seller'" });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userDoc = new User({ email, password: hashedPassword, name, role });
    await userDoc.save();

    if (!userDoc._id) {
      throw new Error("User ID missing after saving.");
    }
    const payload = { id: userDoc._id.toString(), role: userDoc.role };
    const signOptions: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN_SECONDS || 3600 };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, signOptions);
    console.log("Auth: Registered user and generated token for:", email);

    res.status(201).json({
      token,
      user: {
        id: userDoc._id.toString(),
        email: userDoc.email,
        role: userDoc.role,
        name: userDoc.name,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);
    if (error instanceof Error && error.message.includes("secretOrPrivateKey must have a value")) {
      console.error("FATAL (Register): JWT_SECRET was missing during jwt.sign!");
    }
    res.status(500).json({ message: "Registration failed due to an internal error." });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const userDoc = await User.findOne({ email }).select("+password");
    if (!userDoc) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Type guard to ensure _id is mongoose.Types.ObjectId
    if (!(userDoc._id instanceof mongoose.Types.ObjectId)) {
      throw new Error("Invalid user ID");
    }

    const isMatch = await userDoc.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const payload = { id: userDoc._id.toString(), role: userDoc.role };
    const signOptions: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN_SECONDS || 3600 };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, signOptions);
    console.log("Auth: Generated token for user:", email);

    res.json({
      token,
      user: {
        id: userDoc._id.toString(),
        email: userDoc.email,
        name: userDoc.name,
        role: userDoc.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    if (error instanceof Error && error.message.includes("secretOrPrivateKey must have a value")) {
      console.error("FATAL (Login): JWT_SECRET was missing during jwt.sign!");
    }
    res.status(500).json({ message: "Login failed due to an internal server error." });
  }
};

export const promote = async (req: Request, res: Response): Promise<void> => {
  const { userId, role } = req.body;
  try {
    if (!userId || !role) {
      res.status(400).json({ message: "Missing required fields (userId, role)" });
      return;
    }
    if (role !== "admin") {
      res.status(400).json({ message: "Invalid role. Only 'admin' can be assigned via promote" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.role === "admin") {
      res.status(400).json({ message: "User is already an admin" });
      return;
    }
    if (user.email === SUPERADMIN_EMAIL) {
      res.status(403).json({ message: "Operation not allowed: Cannot change the role of the superadmin account." });
      return;
    }

    user.role = role;
    await user.save();

    res.json({ message: `User ${user.email} promoted to admin successfully` });
  } catch (error) {
    console.error("Promotion Error:", error);
    res.status(500).json({ message: "Promotion failed due to an internal server error." });
  }
};

export const demote = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id) {
    res.status(401).json({ message: "Authentication details missing for administrator." });
    return;
  }
  const adminId = req.user.id;

  try {
    const { userId, role } = req.body;
    if (!userId || !role) {
      res.status(400).json({ message: "Missing required fields (userId, role)" });
      return;
    }
    if (!["buyer", "seller"].includes(role)) {
      res.status(400).json({ message: "Invalid role. Must be 'buyer' or 'seller' for demotion" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User to demote not found" });
      return;
    }

    if (user.email === SUPERADMIN_EMAIL) {
      res.status(403).json({ message: "Operation not allowed: Cannot demote the superadmin account" });
      return;
    }
    if (userId === adminId) {
      res.status(403).json({ message: "Operation not allowed: Cannot demote yourself" });
      return;
    }
    if (user.role !== "admin") {
      res.status(400).json({ message: `Cannot demote: User is currently a '${user.role}'.` });
      return;
    }
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      res.status(403).json({ message: "Operation not allowed: Cannot demote the last admin" });
      return;
    }

    user.role = role;
    await user.save();

    res.json({ message: `User ${user.email} demoted to ${role} successfully` });
  } catch (error) {
    console.error("Demotion Error:", error);
    res.status(500).json({ message: "Demotion failed due to an internal server error." });
  }
};