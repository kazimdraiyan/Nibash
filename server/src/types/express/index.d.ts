// for using req.user
declare global {
  namespace Express {
    // reopening Express
    // declaration merging , ts merges all the declarations together into one, rather than overwriting
    // so, we take the existing Request interface, then add our own funtionalities
    interface Request {
      user?: {
        // makes it optional. req.user can be undefined
        id: number;
        email: string;
      };
    }
  }
}

export {}; // makes this a module, required for global augmentation to work
