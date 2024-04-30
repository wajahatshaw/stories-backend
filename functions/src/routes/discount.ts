import {Router as router, Request, Response} from "express";
import {discountCollection, usersCollection} from "../config";
import {statusCodes} from "../constants/statusCodes";
import {
  addDiscountMiddleware,
  applyDiscountMiddleware,
  userDiscountMiddleware,
} from "../middlewares/discount";
import {
  CustomRequest,
  verifyTokenMiddleware,
} from "../middlewares/verifyToken";

const expressRouter = router();

expressRouter.post(
  "/user-discount",
  verifyTokenMiddleware,
  userDiscountMiddleware,
  async (req: Request, res: Response) => {
    try {
      const {uId, discountPercentage, weeksWithDiscount} = req.body;
      const userRef = usersCollection.doc(uId);
      const userSnapshot = await userRef.get();
      if (!userSnapshot.exists) {
        res.status(statusCodes.NOT_FOUND).json({message: "User not found!"});
        return;
      }
      userRef.set(
        {
          discountPercentage,
          weeksWithDiscount,
        },
        {merge: true}
      );
      res
        .status(statusCodes.OK)
        .json({message: "Discount information stored successfully"});
    } catch (error) {
      console.error("Error while stroing discount information: ", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

expressRouter.post(
  "/add-discount",
  verifyTokenMiddleware,
  addDiscountMiddleware,
  async (req: Request, res: Response) => {
    try {
      const {percentage, discountCode} = req.body;
      const existingDiscount = await discountCollection
        .where("discountCode", "==", discountCode)
        .get();
      if (!existingDiscount.empty) {
        res
          .status(statusCodes.BAD_REQUEST)
          .json({message: "Discount code already exists!"});
        return;
      }
      await discountCollection.add({percentage, discountCode});
      res.json({message: "Discount added successfully!"});
    } catch (error) {
      console.error("Error while adding discount ", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

expressRouter.post(
  "/apply-discount",
  verifyTokenMiddleware,
  applyDiscountMiddleware,
  async (req: CustomRequest, res: Response) => {
    try {
      const uId = req.uid || "";
      const {discountCode} = req.body;
      const userDoc = await usersCollection.doc(uId).get();
      if (!userDoc.exists) {
        res.status(statusCodes.NOT_FOUND).json("User not found!");
        return;
      }
      const discountQuery = await discountCollection
        .where("discountCode", "==", discountCode)
        .get();
      if (discountQuery.empty) {
        res
          .status(statusCodes.BAD_REQUEST)
          .json({message: "Invalid discount code!"});
        return;
      }
      await usersCollection
        .doc(uId)
        .set({discountId: discountQuery.docs[0].id}, {merge: true});
      res.json({
        message: "Discount applied successfully!",
        discountPercentage: discountQuery.docs[0].data().percentage,
      });
    } catch (error) {
      console.error("Error while applying discount ", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

expressRouter.get(
  "/discounted-price",
  verifyTokenMiddleware,
  async (req: CustomRequest, res: Response) => {
    try {
      const uId = req.uid || "";
      const userDoc = await usersCollection.doc(uId).get();
      if (!userDoc.exists) {
        res.status(statusCodes.NOT_FOUND).json("User not found!");
        return;
      }
      const userData = userDoc.data();
      if (!userData || !userData.discountId) {
        res.status(statusCodes.BAD_REQUEST)
          .json("Discount not applied for this user!");
        return;
      }
      const discountId = userData.discountId;
      const discountDoc = await discountCollection.doc(discountId).get();
      if (!discountDoc.exists) {
        res.status(statusCodes.INTERNAL_SERVER_ERR).json("Discount not found!");
        return;
      }
      // const priceDoc = await pricesCollection.doc("prices").get();
      // const {weeklyPrice, annualPrice} = priceDoc.data() as {
      //   weeklyPrice: number;
      //   annualPrice: number;
      // };
      const discountData = discountDoc.data();
      console.log(">>>>>", discountData);
      if (!discountData || typeof discountData.percentage !== "string") {
        res.status(statusCodes.INTERNAL_SERVER_ERR)
          .json("Invalid discount data!");
        return;
      }
      const discountPercentage = parseFloat(discountData.percentage);

      // const weeklyDiscountedPrice =
      // weeklyPrice * (1 -discountPercentage/ 100);
      // const annualDiscountedPrice =
      // annualPrice * (1 -discountPercentage/ 100);
      // const discountWeeklyAmount =
      // (weeklyPrice - weeklyDiscountedPrice).toFixed(2);
      // const discountAnnualAmount =
      // (annualPrice - annualDiscountedPrice).toFixed(2);

      res.json({
        percentage: discountPercentage,
      });
    } catch (error) {
      console.error("Error while calculating discounted price: ", error);
      res.status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

expressRouter.get(
  "/discounts",
  verifyTokenMiddleware,
  async (req: CustomRequest, res: Response) => {
    try {
      const discountsSnapshot = await discountCollection.get();
      if (discountsSnapshot.empty) {
        res.status(statusCodes.NOT_FOUND).json("No discounts found!");
        return;
      }
      const discounts: { id: string; percentage: number; Code: string; }[] = [];
      discountsSnapshot.forEach((doc) => {
        const discountData = doc.data();
        console.log(">>>>>>>>>", discountData);
        discounts.push({
          id: doc.id,
          percentage: discountData.percentage,
          Code: discountData.discountCode,
        });
      });

      res.json(discounts);
    } catch (error) {
      console.error("Error while fetching discounts: ", error);
      res.status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

export const discountRouter = expressRouter;
