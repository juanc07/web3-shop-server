// src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; // Ensure jwt is imported
import mongoose from 'mongoose'; // Import mongoose

// Assuming IUser is exported from your User model
import User, { IUser } from "../models/User";

// Define Superadmin Email (preferably from environment)
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "admin@example.com";

// Define JWT Expiry in SECONDS (checked on startup in server.ts)
const JWT_EXPIRES_IN_SECONDS: number = parseInt(process.env.JWT_EXPIRES_IN_SECONDS || '3600', 10);
// No need for the isNaN check here if server.ts handles it robustly on startup

// --- REMOVE THE TOP-LEVEL JWT_SECRET CONSTANT ---
// const JWT_SECRET = process.env.JWT_SECRET!; // REMOVE THIS LINE
// console.log(`DEBUG: Value of JWT_SECRET constant in authController module scope: [${JWT_SECRET}]`); // REMOVE THIS


export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, role } = req.body;
  try {
    // --- Input Validation ---
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
    // --- End Validation ---

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userDoc = new User({ email, password: hashedPassword, name, role });
    await userDoc.save();

    // --- Generate Token and Response ---
    if (!userDoc._id) {
        throw new Error("User ID missing after saving.");
    }
    const payload = { id: (userDoc._id as any).toString(), role: userDoc.role };
    const signOptions: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN_SECONDS || 3600 };

    // Access process.env directly here. Use '!' because server.ts checks it.
    const token = jwt.sign(payload, process.env.JWT_SECRET!, signOptions); // FIXED

    // Send response
    res.status(201).json({
      token,
      user: {
        id: (userDoc._id as any).toString(),
        email: userDoc.email,
        role: userDoc.role,
        name: userDoc.name
      }
    });
  } catch (error) {
    console.error("Registration Error:", error);
    // Check if error is specifically about JWT secret missing
    if (error instanceof Error && error.message.includes('secretOrPrivateKey must have a value')) {
        console.error("FATAL (Register): JWT_SECRET was missing during jwt.sign!");
    }
    res.status(500).json({ message: "Registration failed due to an internal error." });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
     // --- Input Validation ---
     if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
    }
    // --- End Validation ---

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // --- Generate Token and Response ---
    const payload = { id: (user._id as any).toString(), role: user.role };
    const signOptions: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN_SECONDS || 3600 };

    // Access process.env directly here. Use '!' because server.ts checks it.
    const token = jwt.sign(payload, process.env.JWT_SECRET!, signOptions); // FIXED

    // Send response
    res.json({
      token,
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
     // Check if error is specifically about JWT secret missing
     if (error instanceof Error && error.message.includes('secretOrPrivateKey must have a value')) {
        console.error("FATAL (Login): JWT_SECRET was missing during jwt.sign!");
    }
    res.status(500).json({ message: "Login failed due to an internal server error." });
  }
};


// --- promote and demote functions remain the same ---

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

    const user = await User.findById(userId); // Fetch full document
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.role === 'admin') {
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
  const { userId, role } = req.body;
  if (!req.user || !req.user.id) {
       res.status(401).json({ message: "Authentication details missing for administrator." });
       return;
  }
  const adminId = req.user.id;

  try {
    if (!userId || !role) {
        res.status(400).json({ message: "Missing required fields (userId, role)" });
        return;
    }
    if (!["buyer", "seller"].includes(role)) {
      res.status(400).json({ message: "Invalid role. Must be 'buyer' or 'seller' for demotion" });
      return;
    }

    const user = await User.findById(userId); // Fetch full document
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
    if (user.role !== 'admin') {
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