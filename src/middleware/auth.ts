// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface ReqUser {
  id: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: ReqUser;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  console.log(`Authenticate middleware: Checking auth for ${req.method} ${req.path}`);
  const authHeader = req.headers.authorization;
  console.log(`Authenticate middleware: Auth header: [${authHeader}]`);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("Authenticate middleware: FAIL - No 'Bearer ' token found in header.");
    res.status(401).json({ message: "Authentication failed: Token missing or invalid format" });
    return;
  }

  const token = authHeader.split(" ")[1];
  console.log(`Authenticate middleware: Extracted token: [${token ? "present" : "missing"}]`);

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("FATAL (Authenticate): JWT_SECRET is missing from environment!");
    res.status(500).json({ message: "Internal server configuration error (JWT Secret)." });
    return;
  }

  try {
    console.log("Authenticate middleware: Attempting jwt.verify...");
    const decoded = jwt.verify(token, secret) as ReqUser;
    console.log("Authenticate middleware: SUCCESS - Token verified. Decoded:", decoded);

    if (!decoded || typeof decoded.id !== "string" || !Array.isArray(decoded.roles)) {
      console.error("Authenticate middleware: FAIL - Invalid token payload structure after decoding:", decoded);
      throw new Error("Invalid token payload structure");
    }

    req.user = { id: decoded.id, roles: decoded.roles };
    next();
  } catch (error) {
    console.error("Authenticate middleware: FAIL - jwt.verify failed:", error instanceof Error ? error.message : error);
    let message = "Authentication failed: Invalid token";
    if (error instanceof jwt.TokenExpiredError) {
      message = "Authentication failed: Token expired";
    } else if (error instanceof jwt.JsonWebTokenError) {
      message = `Authentication failed: ${error.message}`;
    }
    res.status(401).json({ message });
  }
};

export const restrictTo = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.roles || !req.user.roles.some((role: string) => allowedRoles.includes(role))) {
      console.log(
        `RestrictTo Middleware: FAIL - User roles '${req.user?.roles.join(", ")}' not in allowed roles [${allowedRoles.join(", ")}] for ${req.method} ${req.path}`
      );
      res.status(403).json({ message: "Forbidden: You do not have permission to perform this action" });
      return;
    }
    console.log(`RestrictTo Middleware: SUCCESS - User roles '${req.user?.roles.join(", ")}' allowed for ${req.method} ${req.path}`);
    next();
  };
};

export const authenticateAdmin = (req: Request, res: Response, next: NextFunction): void => {
  authenticate(req, res, () => {
    if (req.user?.roles.includes("admin")) {
      next();
    } else if (req.user) {
      console.log(`AuthenticateAdmin Middleware: FAIL - User roles are '${req.user?.roles.join(", ")}', not 'admin'`);
      res.status(403).json({ message: "Forbidden: Admin privileges required." });
    }
  });
};