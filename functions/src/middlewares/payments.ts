import {Request, Response, NextFunction} from "express";
import {statusCodes} from "../constants/statusCodes";
import {isValidString} from "../utils/validation";

export const createCustomerCardMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {nonce, card} = req.body;
  if (!nonce) {
    res.status(statusCodes.BAD_REQUEST).json({message: "nonce is required!"});
    return;
  }
  if (!card) {
    res.status(statusCodes.BAD_REQUEST).json({message: "card is required!"});
    return;
  }
  next();
};

export const deleteCustomerCardMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) =>{
  const {cardId} = req.body;
  if (!isValidString(cardId)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "cardId is required and must be non-empty string!"});
    return;
  }
  next();
};

export const processPaymentMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {cardId, orderItems, orderType} = req.body;
  if (orderType && !isValidString(orderType)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "orderType must be valid string!"});
    return;
  }
  if (!cardId) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "cardId is required!"});
    return;
  }
  if (!orderItems) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "orderItems is required!"});
    return;
  }
  next();
};
