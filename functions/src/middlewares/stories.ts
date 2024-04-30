import {Request, Response, NextFunction} from "express";
import {isNonEmptyArray, isValidString} from "../utils/validation";
import {statusCodes} from "../constants/statusCodes";
import * as Busboy from "busboy";
import * as logger from "firebase-functions/logger";
import {UploadedFile} from "../types";
import {storeFileToFirebaseStorage} from "../utils/storeFile";

export const addStoryMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {stories} = req.body;

  for (const story of stories) {
    const {storyName, author, content} = story;
    if (!isValidString(storyName)) {
      res
        .status(statusCodes.BAD_REQUEST)
        .json({message: "Story name should be a non-empty string!"});
      return;
    }

    if (!isValidString(author)) {
      res
        .status(statusCodes.BAD_REQUEST)
        .json({message: "Author name should be non-empty string!"});
      return;
    }

    if (!isValidString(content)) {
      res
        .status(statusCodes.BAD_REQUEST)
        .json({message: "Content should be non-empty string!"});
      return;
    }
  }
  next();
};

export const validatePackIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const packId = req.params.packId;
  if (!isValidString(packId)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "Pack id should be a non empty string!"});
    return;
  }
  next();
};

export const validateStoryIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const storyId = req.params.storyId;
  if (!isValidString(storyId)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "Story id should be a non empty string!"});
    return;
  }
  next();
};

export const validateStoriesArrayMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {stories} = req.body;
  if (!isNonEmptyArray(stories)) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({message: "Stories must be non-empty array!"});
    return;
  }
  next();
};

export const processFilesMiddleware = (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const busboy = Busboy({headers: req.headers});
  const filePromises: Promise<{[key: string]: string} | undefined>[] = [];

  busboy.on("file", async (fieldname, file, {filename}) => {
    logger.log(`Processed file ${filename}`);

    const uploadedFile: UploadedFile = {
      originalname: filename,
      stream: file,
      fieldName: fieldname,
    };

    filePromises.push(storeFileToFirebaseStorage(uploadedFile));
  });

  busboy.on("finish", async () => {
    try {
      logger.log(`fileUrls ==> ${filePromises}`);
      const fileUrls = await Promise.all(filePromises);
      logger.log(`fileUrls ==> ${JSON.stringify(fileUrls)}`);
      req.body = {};
      req.body.files = fileUrls;
      next();
    } catch (error) {
      logger.error(`Error uploading files: ${error}`);
      next(error);
    }
  });
  busboy.end(req.rawBody);
};

