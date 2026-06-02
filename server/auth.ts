import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "travel_collaborative_planner_secret_key_993";

export interface TokenPayload {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Generate a cryptographically signed secure token.
 */
export function generateToken(payload: TokenPayload): string {
  // Expiry set to 24 hours (86,400,000 ms)
  const expanded = {
    ...payload,
    exp: Date.now() + 86400000,
  };
  const bodyString = JSON.stringify(expanded);
  const base64Body = Buffer.from(bodyString).toString("base64");
  const hmac = crypto.createHmac("sha256", JWT_SECRET);
  hmac.update(base64Body);
  const signature = hmac.digest("hex");
  return `${base64Body}.${signature}`;
}

/**
 * Verify a token and return the payload if valid.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [base64, signature] = parts;

    const hmac = crypto.createHmac("sha256", JWT_SECRET);
    hmac.update(base64);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      return null;
    }

    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    const payload = JSON.parse(jsonStr);

    if (payload.exp < Date.now()) {
      return null; // Expired
    }

    return {
      id: payload.id,
      email: payload.email,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Express Middleware to protect endpoints.
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    res.status(401).json({ error: "Unauthorized access. No token provided." });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(403).json({ error: "Session expired or invalid login token." });
    return;
  }

  req.user = payload;
  next();
}
