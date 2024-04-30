import {Request, Response, NextFunction} from "express";
import {isValidString} from "../utils/validation";
import {statusCodes} from "../constants/statusCodes";

export const createSubscriptionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {planType} = req.body;
  if (!isValidString(planType)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "plan type must be a non-empty string!"});
    return;
  }
  next();
};
