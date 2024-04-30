import {Request, Response, NextFunction} from "express";
import {isValidString} from "../utils/validation";
import {statusCodes} from "../constants/statusCodes";


export const userDiscountMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {uId, discountPercentage, weeksWithDiscount} = req.body;
  if (!isValidString(uId)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "uId must be a non empty string!"});
    return;
  }
  if (!isValidString(discountPercentage)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "Discount percentage must be a non empty string!"});
    return;
  }
  if (
    isNaN(parseFloat(discountPercentage)) ||
    parseFloat(discountPercentage) < 0 ||
    parseFloat(discountPercentage) > 100
  ) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({
        message: "Discount percentage must be a number between 0 and 100!",
      });
    return;
  }

  if (!isValidString(weeksWithDiscount)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "Weeks with discount must be a non empty string!"});
    return;
  }

  next();
};

export const addDiscountMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {percentage, discountCode} = req.body;
  if (
    isNaN(parseFloat(percentage)) ||
    parseFloat(percentage) < 0 ||
    parseFloat(percentage) > 100
  ) {
    res.status(statusCodes.BAD_REQUEST).json({
      message: "Discount percentage must be a number between 0 and 100!",
    });
    return;
  }

  if (!isValidString(discountCode)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "Discount Code must be a non empty string!"});
    return;
  }
  next();
};

export const applyDiscountMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {discountCode} = req.body;
  if (!isValidString(discountCode)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "discountCode must be a non-empty string!"});
    return;
  }
  next();
};
