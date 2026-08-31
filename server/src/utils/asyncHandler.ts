import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.js";

type AsyncFn = (req: Request, res: Response) => Promise<void>;

export const asyncHandler =
  (fn: AsyncFn) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        console.error(err);
        res.status(500).json({ error: "something went wrong" });
      }
    }
  };
