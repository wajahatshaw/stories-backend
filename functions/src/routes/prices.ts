import {Router as router, Request, Response} from "express";
import {pricesCollection} from "../config";
import {statusCodes} from "../constants/statusCodes";
import {savePricesMiddleware} from "../middlewares/prices";
import {verifyTokenMiddleware} from "../middlewares/verifyToken";
import admin = require("firebase-admin");

const expressRouter = router();

expressRouter.post(
  "/save-prices",
  verifyTokenMiddleware,
  savePricesMiddleware,
  async (req: Request, res: Response) => {
    try {
      const {weeklyPrice, annualPrice} = req.body;
      await pricesCollection.doc("prices").set({
        weeklyPrice,
        annualPrice,
      });
      res.status(statusCodes.OK).json({message: "Prices saved successfully"});
    } catch (error) {
      console.error("Error saving prices:", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error"});
      return;
    }
  }
);

expressRouter.get(
  "/",
  verifyTokenMiddleware,
  async (req: Request, res: Response) => {
    try {
      const remoteConfig = admin.remoteConfig();
      const fetchedConfig = await remoteConfig.getTemplate();
      const weeklyPrice = fetchedConfig.parameters.weeklyPrice;
      const annualPrice = fetchedConfig.parameters.annualPrice;
      const weeklyPlan =
      (weeklyPrice?.defaultValue as { value: string })?.value;
      const annualPlan =
      (annualPrice?.defaultValue as { value: string })?.value;
      res.json({weeklyPlan, annualPlan});
    } catch (error) {
      console.error("Error while getting prices", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

export const pricesRouter = expressRouter;
