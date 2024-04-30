import {
  db,
  discountCollection,
  subscriptionsCollection,
  usersCollection,
} from "../config";
import {squareClient} from "../config/squareClient";
import * as crypto from "crypto";
import {getUserData} from "./getUserData";

const {subscriptionsApi, catalogApi} = squareClient;

export const createSubscription = async (
  uId: string,
  planType: string,
  squareCustomerId: string
): Promise<any> => {
  try {
    // Create or fetch the subscription plan ID
    const planId = await getOrCreateSubscriptionPlanId();

    // Create the subscription plan variation
    const variationId = await createSubscriptionPlanVariation(planId, planType);
    const {userData} = await getUserData(uId);
    if (!userData) {
      throw new Error("User data not found");
    }
    if (!userData.squareCards) {
      throw new Error("Square card not found!");
    }
    const cardId = userData.squareCards[0].id;
    console.log("CARD ID: ", cardId);
    // Initialize discount percentage to 0
    let discountPercentage = 0;

    if (userData.discountId) {
      // Fetch discount document from discounts collection
      const discountDoc =
      await discountCollection.doc(userData.discountId).get();
      if (discountDoc.exists) {
        // Retrieve discount percentage from discount document
        discountPercentage = parseInt(discountDoc.data()?.percentage || 0);
      }
    }

    // Define base prices for weekly and yearly subscriptions
    const weeklyPrice = 100; // $1
    const yearlyPrice = 3900; // $39

    // Calculate adjusted price based on plan type
    let adjustedPrice = 0;

    if (planType.toUpperCase() === "WEEKLY") {
      adjustedPrice = weeklyPrice - (weeklyPrice * discountPercentage) / 100;
    } else if (planType.toUpperCase() === "ANNUAL") {
      adjustedPrice = yearlyPrice - (yearlyPrice * discountPercentage) / 100;
    } else {
      throw new Error("Invalid plan type");
    }

    // Construct the subscription request
    const subscriptionRequest = {
      idempotencyKey: crypto.randomBytes(12).toString("hex"),
      locationId: process.env.LOCATION_ID ?? "",
      planId,
      customerId: squareCustomerId,
      planVariationId: variationId,
      cardId,
      priceOverrideMoney: {
        amount: BigInt(adjustedPrice),
        currency: "USD",
      },
    };

    // Create the subscription
    const response = await subscriptionsApi.createSubscription(
      subscriptionRequest
    );
    const subscriptionId = response.result.subscription?.id ?? "";

    // Update user's collection
    await usersCollection.doc(uId).update({
      subscription: {
        subscriptionId,
        status: response.result.subscription?.status,
      },
    });

    // Update subscription collection
    const subscriptionData = {
      planType,
      squareCustomerId,
      variationId,
      planId,
      cardId,
      status: response.result.subscription?.status,
      createdAt: response.result.subscription?.createdAt,
      startDate: response.result.subscription?.startDate,
    };
    await subscriptionsCollection.doc(subscriptionId).set(subscriptionData);

    return subscriptionData;
  } catch (e) {
    console.error("Error in createSubscription function: ", e);
    throw e;
  }
};

export const getOrCreateSubscriptionPlanId = async (): Promise<string> => {
  try {
    let subscriptionPlanId = "";

    // Check if the subscription plan already exists
    const existingPlan = await catalogApi.listCatalog(
      undefined,
      "SUBSCRIPTION_PLAN"
    );
    console.log("existing plan: ", existingPlan.result);
    const existingPlans = existingPlan.result.objects || [];

    const foundPlan = existingPlans.find(
      (plan) => plan.subscriptionPlanData?.name === "stories_subscription"
    );
    if (foundPlan) {
      console.log("Inside found plan!");
      subscriptionPlanId = foundPlan.id || "";
    } else {
      console.log("Inside new plan!");
      const newPlan = {
        idempotencyKey: crypto.randomBytes(12).toString("hex"),
        object: {
          type: "SUBSCRIPTION_PLAN",
          id:
          `#stories_subscription_${Math.random().toString(36).substring(7)}`,
          subscriptionPlanData: {
            name: "stories_subscription",
            phases: [
              {
                cadence: "WEEKLY",
                periods: 1,
                ordinal: BigInt(0),
                pricing: {
                  type: "STATIC",
                  fixedPriceMoney: {
                    // Weekly price in smallest denomination of currency
                    amount: BigInt(1000),
                    currency: "USD",
                  },
                },
              },
              {
                cadence: "ANNUAL",
                periods: 1,
                ordinal: BigInt(1),
                pricing: {
                  type: "STATIC",
                  fixedPriceMoney: {
                    // Yearly price in smallest denomination of currency
                    amount: BigInt(3900),
                    currency: "USD",
                  },
                },
              },
            ],
          },
        },
      };
      const newPlanResponse = await catalogApi.upsertCatalogObject(newPlan);
      subscriptionPlanId = newPlanResponse.result.catalogObject?.id || "";
    }
    console.log(subscriptionPlanId);
    return subscriptionPlanId;
  } catch (e) {
    console.error("Error in getOrCreateSubscriptionPlanId function: ", e);
    throw e;
  }
};

const createSubscriptionPlanVariation = async (
  planId: string,
  planType: string
): Promise<string> => {
  try {
    const response = await catalogApi.upsertCatalogObject({
      idempotencyKey: crypto.randomBytes(12).toString("hex"),
      object: {
        type: "SUBSCRIPTION_PLAN_VARIATION",
        id: `#${planId}_variation`, // Unique id for the variation
        subscriptionPlanVariationData: {
          // Name for the variation
          name: `Subscription variation for ${planType}`,
          phases: [
            {
              // Cadence based on planType
              cadence:
                planType.toUpperCase() === "WEEKLY" ? "WEEKLY" : "ANNUAL",
              // 1 week for weekly, 12 months for yearly
              periods: planType.toUpperCase() === "WEEKLY" ? 1 : 12,
              // Ordinal is always 0 for the first phase
              ordinal: BigInt(0),
              pricing: {
                type: "STATIC",
                priceMoney: {
                  amount:
                    planType.toUpperCase() === "WEEKLY" ?
                      BigInt(1000) :
                      BigInt(10000), // Adjust prices as needed
                  currency: "USD",
                },
              },
            },
          ],
          subscriptionPlanId: planId, // Associate with the provided planId
        },
      },
    });

    const variationId = response.result.catalogObject?.id || "";
    return variationId;
  } catch (e) {
    console.error("Error in createSubscriptionPlanVariation function: ", e);
    throw e;
  }
};

export const cancelSubscription = async (
  subscriptionId: string,
  uId: string
) => {
  try {
    const response = await subscriptionsApi.cancelSubscription(subscriptionId);
    const subscriptionDoc = await subscriptionsCollection
      .doc(subscriptionId)
      .get();
    if (!subscriptionDoc.exists) {
      throw new Error(`Subscription doc not found with id ${subscriptionId}`);
    }
    const {userRef} = await getUserData(uId);
    await db.runTransaction(async (transaction) => {
      await Promise.all([
        transaction.update(subscriptionDoc.ref, {
          status: "CANCELLED",
          canceledDate: response.result.subscription?.canceledDate,
        }),
        transaction.update(userRef, {subscription: {}}),
      ]);
    });
    return response.result.subscription;
  } catch (e) {
    console.error("Error in cancelSubscription function: ", e);
    throw e;
  }
};

// this function is for testing purposes
export const getCustomersWithSubscriptions = async () => {
  try {
    const response = await squareClient.subscriptionsApi.searchSubscriptions({
      query: {
        filter: {
          customerIds: [
            "0QW527RNP1MRH4Q1Q7JMWKGN5C",
          ],
          locationIds: [
            process.env.LOCATION_ID ?? "",
          ],
        },
      },
    });
    console.log(response.result.subscriptions);
  } catch (error) {
    console.log(error);
  }
};
