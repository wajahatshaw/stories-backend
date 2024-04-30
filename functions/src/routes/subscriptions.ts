import {Router as router, Response} from "express";
import {
  cancelSubscription,
  createSubscription,
} from "../utils/subscriptionsService";
import {getUserData} from "../utils/getUserData";
import {statusCodes} from "../constants/statusCodes";
import {sendErrorMessage} from "../utils/sendErrorMessage";
import {createSubscriptionMiddleware} from "../middlewares/subscriptions";
import {
  CustomRequest,
  verifyTokenMiddleware,
} from "../middlewares/verifyToken";

const expressRouter = router();

expressRouter.post(
  "/subscription",
  verifyTokenMiddleware,
  createSubscriptionMiddleware,
  async (req: CustomRequest, res: Response) => {
    const uId = req.uid || "";
    const {planType} = req.body;
    try {
      const {squareCustomerId, userData} = await getUserData(uId);
      if (userData?.subscription?.status === "ACTIVE") {
        res
          .status(statusCodes.BAD_REQUEST)
          .json({message: "The subscription is already active!"});
        return;
      }
      const subscriptionResult = await createSubscription(
        uId,
        planType.toUpperCase(),
        squareCustomerId
      );
      res.status(statusCodes.OK).json({
        message: `${planType} subscription created successfully!`,
        subscriptionResult,
      });
      return;
    } catch (e) {
      console.error("Error while creating subscriptions! ", e);
      sendErrorMessage(e, res);
    }
  }
);

expressRouter.post(
  "/cancel-subscription",
  verifyTokenMiddleware,
  async (req: CustomRequest, res: Response) => {
    try {
      const uId = req.uid || "";
      const {userData} = await getUserData(uId);
      if (userData?.subscription?.status != "ACTIVE") {
        res
          .status(statusCodes.BAD_REQUEST)
          .json({message: "Status is not active!"});
        return;
      }
      const subscriptionId = userData?.subscription?.subscriptionId;
      if (!subscriptionId) {
        res
          .status(statusCodes.NOT_FOUND)
          .json({message: `No subscription id found for user ${uId}`});
        return;
      }
      await cancelSubscription(subscriptionId, uId);
      res.json({message: "subscription cancelled! "});
    } catch (error) {
      console.error("Error while cancelling subscription!", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

export const subscriptionsRouter = expressRouter;
