import {
  ApiError as SquareApiCallError,
  ArgumentsValidationError,
} from "square";
import {logger} from "firebase-functions/v1";
import {Response} from "express";
import {AssertionError} from "node:assert";
import {statusCodes} from "../constants/statusCodes";

export const sendErrorMessage = (err: any, res: Response, ...rest: any[]) => {
  logger.error("Error => ", err);
  switch (true) {
  case err instanceof SquareApiCallError:
    res
      .status(err.statusCode)
      .json({message: JSON.stringify(err.errors), ...rest});
    break;
  case err instanceof ArgumentsValidationError:
  case err instanceof AssertionError:
  case err instanceof Error:
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: err.message, ...rest});
    break;
  case typeof err === "object":
    res
      .status(statusCodes.INTERNAL_SERVER_ERR)
      .json({message: JSON.stringify(err)});
    break;
  default:
    res
      .status(statusCodes.INTERNAL_SERVER_ERR)
      .json({message: err, ...rest});
  }
};
