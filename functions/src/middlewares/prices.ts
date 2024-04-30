import {Request, Response, NextFunction} from "express";
import {statusCodes} from "../constants/statusCodes";
import {isValidNumber} from "../utils/validation";

export const savePricesMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {weeklyPrice, annualPrice} = req.body;
  if (!isValidNumber(weeklyPrice)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "Weekly price should be a number greater than 0"});
    return;
  }
  if (!isValidNumber(annualPrice)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "Annual price should be a number greater than 0"});
    return;
  }
  next();
};
