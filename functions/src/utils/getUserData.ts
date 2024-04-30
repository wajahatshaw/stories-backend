import {notEqual} from "node:assert/strict";
import {usersCollection} from "../config";
import {createSquareCustomer} from "./squareCustomer";

export const getUserData = async (
  uId: string
): Promise<{
  userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  userDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;
  userData: FirebaseFirestore.DocumentData | undefined;
  squareCustomerId: string;
}> => {
  notEqual(uId, undefined, "uId must not be undefined!");
  const userRef = usersCollection.doc(uId);
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  notEqual(userData, undefined, "No user found for uId => " + uId);
  const squareCustomerId = userData?.squareCustomerId ??
  (await createSquareCustomer({userData, userRef}));
  notEqual(
    squareCustomerId,
    undefined,
    "square customer id not found for uid => " + uId
  );
  return {userRef, userDoc, userData, squareCustomerId};
};
