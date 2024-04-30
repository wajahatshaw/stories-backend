import {Router as router, Request, Response} from "express";
import {dbRoutes} from "./dbRoutes";
import {storiesRouter} from "./stories";
import {authRouter} from "./auth";
import {usersRouter} from "./users";
import {paymentsRouter} from "./payments";
import {subscriptionsRouter} from "./subscriptions";
import {discountRouter} from "./discount";
import {pricesRouter} from "./prices";

const expressRouter = router();

expressRouter.get("/", (req: Request, res: Response) => {
  return res.json("Stories Backend is up and running! ");
});

expressRouter.use("/test", dbRoutes);

expressRouter.use("/stories", storiesRouter);

expressRouter.use("/auth", authRouter);

expressRouter.use("/users", usersRouter);

expressRouter.use("/payments", paymentsRouter);

expressRouter.use("/subscriptions", subscriptionsRouter);

expressRouter.use("/discount", discountRouter);

expressRouter.use("/prices", pricesRouter);

export const routerV1 = expressRouter;
