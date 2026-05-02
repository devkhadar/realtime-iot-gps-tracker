import { Request, Response, NextFunction } from "express";

const responseFormatter = (req: Request, res: any, next: NextFunction) => {
  res.apiResponse = (statusCode: number, data: any = null, message: string = "", total: number = 0) => {
    res.status(statusCode).json({
      statusCode,
      data,
      message,
      total,
    });
  };
  next();
};

export default responseFormatter;
