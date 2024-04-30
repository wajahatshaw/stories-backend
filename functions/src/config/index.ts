import * as admin from "firebase-admin";
// import {getStorage} from "firebase-admin/storage";

import {ServiceAccount} from "firebase-admin";
import {getStorage} from "firebase-admin/storage";
import {
  COUNTERS_COLLECTION,
  DISCOUNT_COLLECTION,
  ORDERS_COLLECTION,
  PACKS_COLLECTION,
  PRICES_COLLECTION,
  STORIES_COLLECTION,
  SUBSCRIPTIONS_COLLECTION,
  USERS_COLLECTION,
} from "../constants";

const firebaseConfig: ServiceAccount = {
  projectId: "fantasticstories-2024",
  clientEmail: process.env.CLIENT_EMAIL,
  privateKey: process.env.PRIVATE_KEY,
};

const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  storageBucket: process.env.BUCKET_URL,
});
export const auth = firebaseApp.auth();
export const db = firebaseApp.firestore();
// export const firebaseStorage = getStorage(firebaseApp);
export const bucket = admin.storage().bucket();
export const firebaseStorage = getStorage(firebaseApp);

export const storiesCollection = db.collection(STORIES_COLLECTION);
export const packCollection = db.collection(PACKS_COLLECTION);
export const usersCollection = db.collection(USERS_COLLECTION);
export const countersCollection = db.collection(COUNTERS_COLLECTION);
export const subscriptionsCollection = db.collection(SUBSCRIPTIONS_COLLECTION);
export const ordersCollection = db.collection(ORDERS_COLLECTION);
export const discountCollection = db.collection(DISCOUNT_COLLECTION);
export const pricesCollection = db.collection(PRICES_COLLECTION);
