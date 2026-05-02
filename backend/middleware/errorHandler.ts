import { Request, Response, NextFunction } from "express";

const errorHandler = (err: any, req: Request, res: any, next: NextFunction) => {
  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";

  if (typeof res.apiResponse === "function") {
    res.apiResponse(statusCode, null, message);
  } else {
    res.status(statusCode).json({ statusCode, data: null, message });
  }
};

export default errorHandler;
