// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Access JWT_SECRET directly from process.env inside functions
// const JWT_SECRET = process.env.JWT_SECRET!; // Remove top-level constant

// Define ReqUser interface
interface ReqUser {
    id: string;
    role: string;
}

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: ReqUser;
    }
  }
}

// Authentication Middleware
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  console.log(`Authenticate middleware: Checking auth for ${req.method} ${req.path}`); // Log entry
  const authHeader = req.headers.authorization;
  console.log(`Authenticate middleware: Auth header: [${authHeader}]`); // Log header

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("Authenticate middleware: FAIL - No 'Bearer ' token found in header.");
      res.status(401).json({ message: "Authentication failed: Token missing or invalid format" });
      return;
  }

  const token = authHeader.split(" ")[1];
  console.log(`Authenticate middleware: Extracted token: [${token ? 'present' : 'missing'}]`); // Log token presence

  // Retrieve secret *inside* the function
  const secret = process.env.JWT_SECRET;
  if (!secret) {
      // This should have been caught on startup, but double-check
      console.error("FATAL (Authenticate): JWT_SECRET is missing from environment!");
      res.status(500).json({ message: "Internal server configuration error (JWT Secret)." });
      return;
  }

  try {
    // Verify token and type the payload
    console.log("Authenticate middleware: Attempting jwt.verify...");
    const decoded = jwt.verify(token, secret) as ReqUser; // Use retrieved secret
    console.log("Authenticate middleware: SUCCESS - Token verified. Decoded:", decoded);

    // Basic check if decoded object has expected properties
    if (!decoded || typeof decoded.id !== 'string' || typeof decoded.role !== 'string') {
        console.error("Authenticate middleware: FAIL - Invalid token payload structure after decoding:", decoded);
        throw new Error('Invalid token payload structure');
    }

    // Attach the decoded user info to the request object
    req.user = { id: decoded.id, role: decoded.role };

    // Proceed to the next middleware/handler
    next();
  } catch (error) {
    // Log the specific JWT error
    console.error("Authenticate middleware: FAIL - jwt.verify failed:", error instanceof Error ? error.message : error);
    // Send appropriate response based on error type
    let message = "Authentication failed: Invalid token";
    if (error instanceof jwt.TokenExpiredError) {
        message = "Authentication failed: Token expired";
    } else if (error instanceof jwt.JsonWebTokenError) {
        message = `Authentication failed: ${error.message}`; // More specific JWT errors
    }
    res.status(401).json({ message: message });
    // No return needed, response sent.
  }
};

// --- restrictTo and authenticateAdmin remain the same as previous correct versions ---
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
      console.log(`RestrictTo Middleware: FAIL - User role '${req.user?.role}' not in allowed roles [${roles.join(', ')}] for ${req.method} ${req.path}`);
      res.status(403).json({ message: "Forbidden: You do not have permission to perform this action" });
      return;
    }
    console.log(`RestrictTo Middleware: SUCCESS - User role '${req.user?.role}' allowed for ${req.method} ${req.path}`);
    next();
  };
};

export const authenticateAdmin = (req: Request, res: Response, next: NextFunction): void => {
    authenticate(req, res, () => {
        if (req.user?.role === 'admin') {
            next();
        } else if (req.user) {
            console.log(`AuthenticateAdmin Middleware: FAIL - User role is '${req.user?.role}', not 'admin'`);
            res.status(403).json({ message: 'Forbidden: Admin privileges required.' });
            // No return needed, response sent.
        }
        // If req.user is undefined, 'authenticate' already handled it.
    });
};