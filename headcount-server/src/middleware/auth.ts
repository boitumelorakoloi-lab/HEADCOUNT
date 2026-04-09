import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Update the interface to include the 'user' object expected by your routes
export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  user?: {
    id: string;
    role: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string };
    
    // Set individual properties (for legacy support)
    req.userId   = decoded.userId;
    req.userRole = decoded.role;

    // Set the 'user' object (to fix the TS2339 build error)
    req.user = {
      id: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Check both userRole and user.role for safety
  const role = req.user?.role || req.userRole;
  if (role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

// Added helper for lecturers or admins
export const facultyOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role || req.userRole;
  if (role !== "lecturer" && role !== "admin") {
    res.status(403).json({ error: "Faculty or Admin access required" });
    return;
  }
  next();
};
