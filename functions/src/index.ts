/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import * as dotenv from "dotenv";
dotenv.config();
import * as express from "express";
// import dbRouter from './routes/dbRoutes';
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {routerV1} from "./routes/index";
import * as cors from "cors";


const main = express();
main.use(cors());
main.use(express.json());
main.use(express.urlencoded({extended: true}));

main.use("/api/v1", routerV1);

export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebaseee!");
});
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

export const storiesapi = onRequest({timeoutSeconds: 150}, main);
