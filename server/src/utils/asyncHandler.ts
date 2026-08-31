import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';  // custom error class

type AsyncFn = (req: Request, res: Response) => Promise<void>;
// defines a reusable type alias, takes req and res and returns a promise that resolves to nothing
// all the controller functions match this type

export const asyncHandler = (fn: AsyncFn) => async (req: Request, res: Response, next: NextFunction) => {
    // higher order function , take one and return one
    try {
        await fn(req, res);  // calls the original controller
    } catch (err) {
        if (err instanceof AppError) {
            res.status(err.statusCode).json({ error: err.message });  // App_error
        } else {
            console.error(err);
            res.status(500).json({ error: 'something went wrong' });
        }
    }
};
// every route handler needs try catch, so we write this once here and wrap every controller with it in the router files