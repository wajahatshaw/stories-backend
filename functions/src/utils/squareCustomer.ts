import {randomBytes} from "crypto";
import {CreateCustomerRequest} from "square";
import {squareClient} from "../config/squareClient";


export const createSquareCustomer = async ({
  userData,
  userRef,
}: {
  userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  userData: FirebaseFirestore.DocumentData | undefined;
}): Promise<string | undefined> => {
  console.log("creating square customer for user => ", userRef.id);
  const {customersApi} = squareClient;
  const createCustomerRequest: CreateCustomerRequest = {
    idempotencyKey: randomBytes(12).toString("hex"),
    emailAddress: userData?.email,
    givenName: userData?.firstName,
    familyName: userData?.lastName,
  };
  const {result} = await customersApi.createCustomer(createCustomerRequest);
  await userRef.update({squareCustomerId: result?.customer?.id ?? ""});
  return result?.customer?.id;
};

