import {Router as router, Request, Response} from "express";
import {CustomRequest, verifyTokenMiddleware} from "../middlewares/verifyToken";
import {
  auth,
  usersCollection,
  storiesCollection,
  discountCollection,
} from "../config";
import {statusCodes} from "../constants/statusCodes";
import {User} from "../types";
import {isValidEmail} from "../utils/validation";
import {searchUsers} from "../utils/searchUsers";
import {
  searchUsersMiddleware,
  saveUserDataMiddleware,
  storyIdParamsMiddleware,
  resetPasswordMiddleware,
  planTypeMiddleware,
}
  from "../middlewares/users";
import * as bcrypt from "bcrypt";
import {getUserData} from "../utils/getUserData";

const expressRouter = router();

expressRouter.get(
  "/",
  verifyTokenMiddleware,
  async (req: Request, res: Response) => {
    try {
      const usersSnapshot = await usersCollection.get();
      const users: User[] = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        users.push({
          uId: doc.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
        });
      });
      res.json(users);
    } catch (error) {
      console.error("Error while getting user data: ", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

expressRouter.post(
  "/reset-password",
  verifyTokenMiddleware,
  async (req: Request, res: Response) => {
    const {email} = req.body;
    try {
      if (!isValidEmail(email)) {
        res.status(statusCodes.BAD_REQUEST).json({message: "invalid email!"});
        return;
      }
      await auth.getUserByEmail(email);
      const emailLink = await auth.generatePasswordResetLink(email);
      console.log(emailLink);
      res.json({message: "Password reset link generated!"});
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        res
          .status(statusCodes.NOT_FOUND)
          .json({message: "No user with that email address exists!"});
        return;
      } else {
        console.error("Error while sending password reset link", error);
        res
          .status(statusCodes.INTERNAL_SERVER_ERR)
          .json({message: "Internal server error"});
      }
    }
  }
);

expressRouter.get(
  "/search-users",
  verifyTokenMiddleware,
  searchUsersMiddleware,
  async (req: Request, res: Response) => {
    const {searchType, query} = req.query;
    try {
      if (!searchType || !query) {
        res
          .status(statusCodes.BAD_REQUEST)
          .json({message: "Search type and query are required parameters"});
        return;
      }
      const users = await searchUsers(searchType.toString(), query.toString());
      if (users.length === 0) {
        res
          .status(statusCodes.NOT_FOUND)
          .json({message: "No user found for " + searchType + " " + query});
        return;
      }
      res.json(users);
    } catch (error) {
      console.error("Error while searcing users: ", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

expressRouter.post(
  "/save-user-data",
  verifyTokenMiddleware,
  saveUserDataMiddleware,
  async (req: Request, res: Response) => {
    const {firstName, lastName, email} = req.body;

    try {
      const userRecord = await auth.getUserByEmail(email);
      const userData = {
        firstName,
        lastName,
        email,
      };

      await usersCollection.doc(userRecord.uid).update(userData);

      res.json({message: "User data saved successfully!"});
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        res.status(statusCodes.NOT_FOUND)
          .json({message: "No user with that email address exists!"});
        return;
      } else {
        console.error("Error while saving user data:", error);
        res.status(statusCodes.INTERNAL_SERVER_ERR)
          .json({message: "Internal server error"});
      }
    }
  }
);

expressRouter.post(
  "/save-story/:storyId",
  verifyTokenMiddleware,
  storyIdParamsMiddleware,
  async (req: CustomRequest, res: Response) => {
    const uId = req.uid || "";
    const storyId = req.params.storyId;
    try {
      const userDoc = await usersCollection.doc(uId).get();
      if (!userDoc.exists) {
        res.status(statusCodes.NOT_FOUND).json({message: "User not found!"});
        return;
      }
      const savedStories = userDoc.data()?.savedStories || [];
      if (!savedStories.includes(storyId)) {
        savedStories.push(storyId);
      }
      await userDoc.ref.update({savedStories});
      res.json("Story saved successfully!");
    } catch (error) {
      console.error("Error while saving story: ", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

expressRouter.get(
  "/saved-stories",
  verifyTokenMiddleware,
  async (req: CustomRequest, res: Response) => {
    const uId = req.uid || "";
    try {
      const userDoc = await usersCollection.doc(uId).get();
      if (!userDoc.exists) {
        res.status(statusCodes.NOT_FOUND).json({message: "User not found!"});
        return;
      }
      const savedStories = userDoc.data()?.savedStories;
      if (!savedStories) {
        res
          .status(statusCodes.BAD_REQUEST)
          .json({message: "User do not have any saved stories"});
        return;
      }
      const storyDocs = await Promise.all(
        savedStories.map(async (storyId: string) => {
          const storyDoc = await storiesCollection.doc(storyId).get();
          if (storyDoc.exists) {
            return {storyId: storyId, ...storyDoc.data()};
          } else {
            return {
              storyId: storyId,
              message:
                "This story is unavailable. " +
                "It may have been deleted or removed!",
            };
          }
        })
      );
      res.json({savedStories: storyDocs});
    } catch (error) {
      console.error("Error while fetching saved stories", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

expressRouter.post(
  "/change-password",
  verifyTokenMiddleware,
  resetPasswordMiddleware,
  async (req: CustomRequest, res: Response) => {
    try {
      const {currentPassword, newPassword} = req.body;
      const uId = req.uid || "";
      const userDoc = await usersCollection.doc(uId).get();
      if (!userDoc.exists) {
        res.status(statusCodes.NOT_FOUND).json({message: "User not found!"});
        return;
      }
      const userData = userDoc.data();
      const isOldPasswordValid = await bcrypt.compare(
        currentPassword,
        userData?.hash
      );
      if (!isOldPasswordValid) {
        res
          .status(statusCodes.BAD_REQUEST)
          .json({messgae: "Incorrect old password!"});
        return;
      }
      await auth.updateUser(uId, {password: newPassword});
      const hashPassword = await bcrypt.hash(newPassword, 10);
      await usersCollection.doc(uId).update({
        hash: hashPassword,
      });
      res.json({message: "Password updated successfully!"});
    } catch (error) {
      console.error("Internal Server Error ", error);
    }
  }
);
expressRouter.get(
  "/discounted-price",
  verifyTokenMiddleware,
  planTypeMiddleware,
  async (req: CustomRequest, res: Response) => {
    try {
      const planType = req.query.planType;
      const uId = req.uid || "";
      const weeklyPrice = 100; // $1
      const yearlyPrice = 3900; // $39
      const {userData} = await getUserData(uId);
      if (!userData) {
        res.status(statusCodes.NOT_FOUND).json({message: "User not found!"});
        return;
      }
      const discountId = userData?.discountId;
      if (!discountId) {
        res
          .status(statusCodes.BAD_REQUEST)
          .json({message: "Discount not found for the user!"});
        return;
      }
      const discountDoc = await discountCollection.doc(discountId).get();
      if (!discountDoc.exists) {
        res
          .status(statusCodes.NOT_FOUND)
          .json({message: "Discount not found!"});
        return;
      }
      const discountPercentage = discountDoc?.data()?.percentage;
      let adjustedPrice = 0;

      if (planType?.toString().toUpperCase() === "WEEKLY") {
        adjustedPrice = weeklyPrice - (weeklyPrice * discountPercentage) / 100;
      } else if (planType?.toString().toUpperCase() === "ANNUAL") {
        adjustedPrice = yearlyPrice - (yearlyPrice * discountPercentage) / 100;
      } else {
        throw new Error("Invalid plan type");
      }
      res.json({message: "Discounted Price in cents: ",
        discountedPrice: adjustedPrice});
    } catch (error) {
      console.error("Error while getting discounted prices: ", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

export const usersRouter = expressRouter;
