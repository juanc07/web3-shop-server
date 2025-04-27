// src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose, { Document } from "mongoose";
import User, { IUser } from "../models/User";
import { getConfig } from "../config";

const config = getConfig();
const SUPERADMIN_EMAIL = config.SUPERADMIN_EMAIL;

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, username, mobileNumber } = req.body;
  try {
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required for standard registration" });
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

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userDoc: IUser & Document = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      username,
      mobileNumber,
      roles: ["buyer", "seller"],
    });
    await userDoc.save();

    const payload = { id: userDoc._id.toString(), roles: userDoc.roles };
    const signOptions: jwt.SignOptions = { expiresIn: config.JWT_EXPIRES_IN_SECONDS };

    const token = jwt.sign(payload, config.JWT_SECRET, signOptions);
    console.log("Auth: Registered user and generated token for:", email);

    res.status(201).json({
      token,
      user: {
        id: userDoc._id.toString(),
        email: userDoc.email,
        firstName: userDoc.firstName,
        lastName: userDoc.lastName,
        username: userDoc.username,
        mobileNumber: userDoc.mobileNumber,
        roles: userDoc.roles,
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

export const registerWithSolana = async (req: Request, res: Response): Promise<void> => {
  const { solanaWallet } = req.body;
  try {
    if (!solanaWallet) {
      res.status(400).json({ message: "Solana wallet address is required" });
      return;
    }

    let userDoc: (IUser & Document) | null = await User.findOne({ solanaWallet });
    if (userDoc) {
      const payload = { id: userDoc._id.toString(), roles: userDoc.roles };
      const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN_SECONDS });
      res.json({
        token,
        user: {
          id: userDoc._id.toString(),
          email: userDoc.email,
          firstName: userDoc.firstName,
          lastName: userDoc.lastName,
          username: userDoc.username,
          mobileNumber: userDoc.mobileNumber,
          roles: userDoc.roles,
          solanaWallet: userDoc.solanaWallet,
        },
      });
      return;
    }

    userDoc = new User({ solanaWallet, roles: ["buyer", "seller"] });
    await userDoc.save();

    const payload = { id: userDoc._id.toString(), roles: userDoc.roles };
    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN_SECONDS });
    console.log("Auth: Registered user with Solana wallet:", solanaWallet);

    res.status(201).json({
      token,
      user: {
        id: userDoc._id.toString(),
        email: userDoc.email,
        firstName: userDoc.firstName,
        lastName: userDoc.lastName,
        username: userDoc.username,
        mobileNumber: userDoc.mobileNumber,
        roles: userDoc.roles,
        solanaWallet: userDoc.solanaWallet,
      },
    });
  } catch (error) {
    console.error("Solana Registration Error:", error);
    res.status(500).json({ message: "Solana registration failed." });
  }
};

export const registerWithPi = async (req: Request, res: Response): Promise<void> => {
  const { piWallet } = req.body;
  try {
    if (!piWallet) {
      res.status(400).json({ message: "Pi Network wallet address is required" });
      return;
    }

    let userDoc: (IUser & Document) | null = await User.findOne({ piWallet });
    if (userDoc) {
      const payload = { id: userDoc._id.toString(), roles: userDoc.roles };
      const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN_SECONDS });
      res.json({
        token,
        user: {
          id: userDoc._id.toString(),
          email: userDoc.email,
          firstName: userDoc.firstName,
          lastName: userDoc.lastName,
          username: userDoc.username,
          mobileNumber: userDoc.mobileNumber,
          roles: userDoc.roles,
          piWallet: userDoc.piWallet,
        },
      });
      return;
    }

    userDoc = new User({ piWallet, roles: ["buyer", "seller"] });
    await userDoc.save();

    const payload = { id: userDoc._id.toString(), roles: userDoc.roles };
    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN_SECONDS });
    console.log("Auth: Registered user with Pi wallet:", piWallet);

    res.status(201).json({
      token,
      user: {
        id: userDoc._id.toString(),
        email: userDoc.email,
        firstName: userDoc.firstName,
        lastName: userDoc.lastName,
        username: userDoc.username,
        mobileNumber: userDoc.mobileNumber,
        roles: userDoc.roles,
        piWallet: userDoc.piWallet,
      },
    });
  } catch (error) {
    console.error("Pi Registration Error:", error);
    res.status(500).json({ message: "Pi Network registration failed." });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const userDoc: (IUser & Document) | null = await User.findOne({ email }).select("+password");
    if (!userDoc) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await userDoc.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const payload = { id: userDoc._id.toString(), roles: userDoc.roles };
    const signOptions: jwt.SignOptions = { expiresIn: config.JWT_EXPIRES_IN_SECONDS };

    const token = jwt.sign(payload, config.JWT_SECRET, signOptions);
    console.log("Auth: Generated token for user:", email);

    res.json({
      token,
      user: {
        id: userDoc._id.toString(),
        email: userDoc.email,
        firstName: userDoc.firstName,
        lastName: userDoc.lastName,
        username: userDoc.username,
        mobileNumber: userDoc.mobileNumber,
        roles: userDoc.roles,
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

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const { email, firstName, lastName, username, mobileNumber } = req.body;
  const userId = req.user?.id;

  try {
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const updateData: Partial<IUser> = {};
    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (username) updateData.username = username;
    if (mobileNumber) updateData.mobileNumber = mobileNumber;

    const userDoc: (IUser & Document) | null = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });
    if (!userDoc) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      user: {
        id: userDoc._id.toString(),
        email: userDoc.email,
        firstName: userDoc.firstName,
        lastName: userDoc.lastName,
        username: userDoc.username,
        mobileNumber: userDoc.mobileNumber,
        roles: userDoc.roles,
        solanaWallet: userDoc.solanaWallet,
        piWallet: userDoc.piWallet,
      },
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Profile update failed." });
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

    const user: (IUser & Document) | null = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.roles.includes("admin")) {
      res.status(400).json({ message: "User is already an admin" });
      return;
    }
    if (user.email === SUPERADMIN_EMAIL) {
      res.status(403).json({ message: "Operation not allowed: Cannot change the role of the superadmin account." });
      return;
    }

    user.roles = [...user.roles, role];
    await user.save();

    res.json({ message: `User ${user.email || user.username} promoted to admin successfully` });
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

    const user: (IUser & Document) | null = await User.findById(userId);
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
    if (!user.roles.includes("admin")) {
      res.status(400).json({ message: `Cannot demote: User is not an admin.` });
      return;
    }
    const adminCount = await User.countDocuments({ roles: "admin" });
    if (adminCount <= 1) {
      res.status(403).json({ message: "Operation not allowed: Cannot demote the last admin" });
      return;
    }

    user.roles = user.roles.filter((r: string) => r !== "admin");
    if (!user.roles.includes(role)) {
      user.roles.push(role);
    }
    await user.save();

    res.json({ message: `User ${user.email || user.username} demoted to ${role} successfully` });
  } catch (error) {
    console.error("Demotion Error:", error);
    res.status(500).json({ message: "Demotion failed due to an internal server error." });
  }
};