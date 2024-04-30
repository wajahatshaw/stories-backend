import {Router as router, Request, Response} from "express";
import {usersCollection} from "../config";
import admin = require("firebase-admin");
import {statusCodes} from "../constants/statusCodes";
import * as jwt from "jsonwebtoken";
import {authMiddleware} from "../middlewares/auth";
import * as bcrypt from "bcrypt";
import {
  CustomRequest,
  verifyTokenMiddleware,
} from "../middlewares/verifyToken";

const expressRouter = router();
const secretKey = process.env.JWT_SECRET_KEY || "";
expressRouter.post(
  "/signup",
  verifyTokenMiddleware,
  authMiddleware,
  async (req: CustomRequest, res: Response) => {
    const {email, password} = req.body;
    const uId = req.uid || "";
    try {
      let existingUser;
      try {
        existingUser = await admin.auth().getUserByEmail(email);
      } catch (error: any) {
        if (error.code === "auth/user-not-found") {
          existingUser = null;
        } else {
          throw error;
        }
      }
      if (existingUser) {
        res
          .status(statusCodes.CONFLICT)
          .json({message: "User already exists!"});
        return;
      }

      // const userRecord =
      // const userRecord =
      await admin.auth().updateUser(uId, {
        email,
        password,
      });

      const hashPassword = await bcrypt.hash(password, 10);
      await usersCollection.doc(uId).set({
        email,
        hash: hashPassword,
        isGuest: false,
      }, {merge: true});
      // const token = jwt.sign(
      //   {email: userRecord?.email, uid: userRecord?.uid},
      //   secretKey,
      //   {
      //     expiresIn: "60 days",
      //   }
      // );
      res.json({success: true});
    } catch (error) {
      console.error("Error sigining up: ", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "internal server error"});
    }
  }
);

expressRouter.post(
  "/login",
  authMiddleware,
  async (req: Request, res: Response) => {
    const {email, password} = req.body;

    try {
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (error:any) {
        if (error.code === "auth/user-not-found") {
          userRecord = null;
        } else {
          throw error;
        }
      }
      if (!userRecord) {
        res.status(statusCodes.NOT_FOUND).json({message: "User not found!"});
        return;
      }
      const userDoc = await usersCollection.doc(userRecord.uid).get();
      const userData = userDoc.data();
      const isValidPassword = await bcrypt.compare(password, userData?.hash);
      if (!isValidPassword) {
        res
          .status(statusCodes.BAD_REQUEST)
          .json({message: "Invalid email or passsword"});
        return;
      }
      const token = jwt.sign(
        {email: userData?.email, uid: userDoc.id},
        secretKey,
        {
          expiresIn: "60 days",
        }
      );
      res.json({success: true, token});
    } catch (error) {
      console.error("Error loging in: ", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

expressRouter.post("/guest-mode", async (req: Request, res: Response) => {
  try {
    const userDoc = usersCollection.doc();
    const createdAt = new Date();
    await userDoc.set({
      uid: userDoc.id,
      firstName: "",
      lastName: "",
      isGuest: true,
      createdAt: createdAt.toLocaleTimeString() +
       " " + createdAt.toDateString(),
    });
    await admin.auth().createUser({
      uid: userDoc.id,
    });
    const token =
    jwt.sign({uid: userDoc.id}, secretKey, {expiresIn: "60 days"});
    res.json({success: true, token});
  } catch (error) {
    console.error("Error in guest mode: ", error);
    res
      .status(statusCodes.INTERNAL_SERVER_ERR)
      .json({message: "Internal server error!"});
  }
});

export const authRouter = expressRouter;
