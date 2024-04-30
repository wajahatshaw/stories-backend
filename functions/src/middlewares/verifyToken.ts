import {Request, Response, NextFunction} from "express";
import * as jwt from "jsonwebtoken";
import {statusCodes} from "../constants/statusCodes";

const secretKey = process.env.JWT_SECRET_KEY || "";
export interface CustomRequest extends Request {
  uid?: string;
}
export const verifyTokenMiddleware = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers["authorization"];

  if (!token) {
    res.status(statusCodes.FORBIDDEN).json({message: "Token not provided"});
    return;
  }
  try {
    const decoded =
    jwt.verify(token, secretKey) as {email: string, uid: string};
    req.uid = decoded.uid;
    next();
  } catch (error) {
    res.status(statusCodes.UNAUTHORIZED).json({error: "Invalid token"});
  }
};
