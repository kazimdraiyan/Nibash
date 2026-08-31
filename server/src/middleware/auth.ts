import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "no token provided" });
        return;
    }
    const token = authHeader.split(" ")[1]; // token starts after Bearer
    try {
        const isValid = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number, email: string };  // decoding the token
        req.user = isValid;        // attaching the decoded value with  the rquest
        next();    // passing the decoded value
    } catch (err) {
        res.status(401).json({ error: "invalid token" });
        return;
    }
};

export default authMiddleware;