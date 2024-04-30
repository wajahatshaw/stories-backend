import {Request, Response, NextFunction} from "express";
import {isValidEmail, isValidString} from "../utils/validation";
import {statusCodes} from "../constants/statusCodes";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {email, password} = req.body;
  if (!isValidEmail(email)) {
    res.status(statusCodes.BAD_REQUEST).json({message: "invalid email!"});
    return;
  }
  if (!isValidString(email)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "email should be non empty string!"});
    return;
  }
  if (!isValidString(password)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "password should be non empty string!"});
    return;
  }
  next();
};
