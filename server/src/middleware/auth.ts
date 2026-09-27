import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { isTokenRevoked } from "../services/auth.service.js";

type AuthenticatedUser = {
  id: number;
  email: string;
};

type RevocationCheck = (token: string) => Promise<boolean>;

export async function getOptionalUser(
  token: string,
  checkRevocation: RevocationCheck = isTokenRevoked,
): Promise<AuthenticatedUser | undefined> {
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET as string) as AuthenticatedUser;
    return (await checkRevocation(token)) ? undefined : user;
  } catch {
    return undefined;
  }
}

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // asynch because now it needs a db call
  // when frontend calls a protected route, it sends the jwt in a header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "no token provided" });
    return;
  }
  const token = authHeader.split(" ")[1]; // token starts after Bearer
  try {
    // jwt.verify checks if the signature is valid using jwt_secret from .env and the expiry_date
    // if it passes it returns the decoded payload
    // as {id: number, email: string} is a type assertion for ts
    // because jwt.verify return type is broader (string | jwtPayload) than we need
    const isValid = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
      email: string;
    }; // decoding the token

    const revoked = await isTokenRevoked(token);
    if (revoked) {
      res.status(401).json({ error: "token has been revoked" });
      return;
    }

    req.user = isValid; // attaching the decoded value with  the request
    // only possible because we opened express Request interface and added a new optional property to it
    next(); // passing the decoded value to the whatever route handler comes after this middleware
  } catch (err) {
    res.status(401).json({ error: "invalid token" });
    return;
  }
};

export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(); // no token — just continue, req.user stays undefined
    return;
  }
  const token = authHeader.split(" ")[1];
  const user = await getOptionalUser(token);
  if (user) req.user = user;
  next();
};

export default authMiddleware;
