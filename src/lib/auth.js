import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";

// JWT Secret - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - Whether passwords match
 */
export const comparePasswords = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate a JWT token for a user
 * @param {object} user - User object
 * @returns {string} - JWT token
 */
export const generateToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {object} - Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new GraphQLError("Invalid or expired token", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
};

/**
 * Get user from request context (middleware function)
 * @param {object} req - Request object
 * @returns {object|null} - User object or null
 */
export const getUserFromToken = async (req, prisma) => {
  // Check both lowercase and uppercase Authorization header
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  
  try {
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    return user;
  } catch (error) {
    console.error("Token verification error:", error.message);
    return null;
  }
};

/**
 * Require authentication middleware
 * @param {object} user - User object from context
 * @throws {GraphQLError} - If user is not authenticated
 */
export const requireAuth = (user) => {
  if (!user) {
    throw new GraphQLError("You must be authenticated to perform this action", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
};

/**
 * Require specific role middleware
 * @param {object} user - User object from context
 * @param {string|string[]} requiredRoles - Required role(s)
 * @throws {GraphQLError} - If user doesn't have required role
 */
export const requireRole = (user, requiredRoles) => {
  requireAuth(user);
  
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  if (!roles.includes(user.role)) {
    throw new GraphQLError("Insufficient permissions", {
      extensions: { code: "FORBIDDEN" },
    });
  }
};