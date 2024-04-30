import {Router as router, Response} from "express";
import {squareClient} from "../config/squareClient";
import {statusCodes} from "../constants/statusCodes";
import {Card, CreateCardRequest} from "square";
import * as crypto from "crypto";
import {getUserData} from "../utils/getUserData";
import {sendErrorMessage} from "../utils/sendErrorMessage";
import {createCustomerCardMiddleware, deleteCustomerCardMiddleware}
  from "../middlewares/payments";
import {CustomRequest, verifyTokenMiddleware} from "../middlewares/verifyToken";
// import {FieldValue} from "firebase-admin/firestore";
// import { ordersCollection } from "../config";
// import * as JSONBig from "json-bigint";

const expressRouter = router();
const {cardsApi} = squareClient;

expressRouter.post(
  "/create-customer-card",
  verifyTokenMiddleware,
  createCustomerCardMiddleware,
  async (req: CustomRequest, res: Response) => {
    const uId = req.uid || "";
    const {nonce, card: reqCard} = req.body;
    try {
      const {userData, userRef, squareCustomerId} = await getUserData(uId);
      if (!squareCustomerId) {
        res
          .status(statusCodes.BAD_REQUEST)
          .json({message: `Square customer id does not exist for ${uId}`});
        return;
      }
      const card: Card = {
        ...reqCard,
        customerId: squareCustomerId,
      };
      const createCustomerCardRequestBody: CreateCardRequest = {
        idempotencyKey: crypto.randomBytes(12).toString("hex"),
        sourceId: nonce,
        card: card,
      };
      console.log("Creating card for customer!");
      const customerCardResponse = await cardsApi.createCard(
        createCustomerCardRequestBody
      );
      if (customerCardResponse.result.errors) {
        sendErrorMessage(customerCardResponse.result.errors, res);
        return;
      }
      console.log("card created for the customer!");
      const cards = userData?.squareCards || [];
      cards.push(customerCardResponse.result.card);
      await userRef.set({squareCards: cards}, {merge: true});
      res.status(statusCodes.OK).json({success: true});
    } catch (e) {
      sendErrorMessage(e, res);
    }
  }
);

expressRouter.get(
  "/get-user-card",
  verifyTokenMiddleware,
  async (req: CustomRequest, res: Response) => {
    const uId = req.uid || "";
    try {
      const {userData} = await getUserData(uId);
      const userCards = userData?.squareCards || [];
      res.status(statusCodes.OK).json({cards: userCards});
    } catch (e) {
      sendErrorMessage(e, res);
    }
  }
);

expressRouter.delete(
  "/delete-customer-card",
  verifyTokenMiddleware,
  deleteCustomerCardMiddleware,
  async (req: CustomRequest, res: Response) => {
    const uId = req.uid || "";
    const {cardId} = req.body as {cardId: string};
    try {
      await cardsApi.disableCard(cardId);
      const {userRef} = await getUserData(uId);
      const userSnapshot = await userRef.get();
      if (userSnapshot.exists) {
        const userData = userSnapshot.data();
        const squareCards = userData?.squareCards || [];
        const index = squareCards.findIndex((card: Card) => card.id === cardId);
        if (index !== -1) {
          squareCards.splice(index, 1);
          await userRef.update({squareCards});
          res.status(statusCodes.OK).json({success: true});
        } else {
          res.status(statusCodes.NOT_FOUND)
            .json({success: false, message: "Card not found."});
        }
      }
    } catch (err) {
      sendErrorMessage(err, res);
    }
  }
);

// expressRouter.post(
//   "/process-payment",
//   verifyTokenMiddleware,
//   processPaymentMiddleware,

//   async (req: Request, res: Response) => {
//     const {uid, cardId, orderItems, orderType} = req.body as {
//       uid: string;
//       cardId: string;
//       orderType: string;
//       orderItems: OrderLineItem[];
//     };
//     try {
//       const {squareCustomerId, userRef} = await getUserData(uid);
//       if (!squareCustomerId) {
//         res.status(statusCodes.BAD_REQUEST).json({
//           error: "An Error occurred!",
//           description: `Square Customer id does not exist for uid ${uid}`,
//         });
//         return;
//       }
//       const orderIdempotencyKey = crypto.randomBytes(12).toString("hex");
//       const {createOrderResponse} = await createSquareOrder({
//         orderType,
//         orderItems,
//         squareCustomerId,
//         idempotencyKey: orderIdempotencyKey,
//       });
//       const paymentIdempotencyKey = crypto.randomBytes(12).toString("hex");
//       const {createPaymentResponse} = await processPayments({
//         cardId,
//         squareCustomerId,
//         createOrderResponse,
//         idempotencyKey: paymentIdempotencyKey,
//       });

//       const squareOrder = createOrderResponse.result.order;
//       ordersCollection.doc(squareOrder?.id ?? "").set({
//         id: squareOrder?.id,
//         squareOrderId: squareOrder?.id,
//         createdAt: squareOrder?.createdAt,
//         updatedAt: squareOrder?.updatedAt,
//         total: squareOrder?.netAmounts?.totalMoney,
//         serviceCharges: squareOrder?.serviceCharges,
//         paymentId: createPaymentResponse.result.payment?.id,
//         ...(orderType ? {orderType} : {}),
//       });
//       await userRef.update({
//         orders: FieldValue.arrayUnion(squareOrder?.id),
//       });
//       res
//         .status(200)
//         .json(
//           JSONBig.parse(JSONBig.stringify
//           (createPaymentResponse.result.payment))
//         );
//     } catch (e) {
//       sendErrorMessage(e, res);
//     }
//   }
// );

export const paymentsRouter = expressRouter;
