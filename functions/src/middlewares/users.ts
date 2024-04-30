import {Request, Response, NextFunction} from "express";
import {isValidString, isValidEmail} from "../utils/validation";
import {statusCodes} from "../constants/statusCodes";

export const searchUsersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {searchType, query} = req.query;
  if (!isValidString(searchType)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "search type must be non-empty string!"});
    return;
  }
  if (!isValidString(query)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "query must be non-empty string!"});
    return;
  }
  next();
};


export const saveUserDataMiddleware = (
  req:Request,
  res:Response,
  next:NextFunction
)=>{
  const {firstName, lastName, email} = req.body;
  if (!isValidEmail(email)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "Please enter a valid email"});
    return;
  }
  if (!isValidString(firstName)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "First Name should not be an empty string"});
    return;
  }
  if (!isValidString(lastName)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "Last Name should not be an empty string"});
    return;
  }
  next();
};

export const userIdParamsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const uId = req.params.uId;
  if (!isValidString(uId)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "uId must be a non empty string!"});
    return;
  }
  next();
};

export const storyIdParamsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const storyId = req.params.storyId;
  if (!isValidString(storyId)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "story id must be a non empty string!"});
    return;
  }
  next();
};

export const resetPasswordMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {currentPassword, newPassword} = req.body;
  if (!isValidString(newPassword)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "New password must be a non-empty string"});
    return;
  }
  if (!isValidString(currentPassword)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "Old password must be a non-empty string"});
    return;
  }
  if (newPassword.length < 6) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "Password must be atleast 6 characters long!"});
    return;
  }
  next();
};

export const planTypeMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const planType = req.query.planType;
  if (!isValidString(planType?.toString())) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "Plan type must be valid non empty string!"});
  }
  next();
};
