import {usersCollection} from "../config";
import {User} from "../types";

export const searchUsers = async (searchType: string, query: string) => {
  try {
    const userRef = usersCollection;
    let snapshot;
    let user: User;
    let userDoc;
    let userData;
    switch (searchType) {
    case "uId":
      userDoc = await userRef.doc(query).get();
      if (userDoc.exists) {
        userData = userDoc.data();
        user = {
          uId: userDoc.id,
          email: userData?.email,
          firstName: userData?.firstName,
          lastName: userData?.lastName,
        };
        return [user];
      }
      break;
    case "name":
      snapshot = await userRef
        .where("name", "==", query.toLocaleLowerCase())
        .get();
      break;

    case "email":
      snapshot = await userRef
        .where("email", "==", query.toLowerCase())
        .get();
      break;

    default:
      throw new Error("Invalid search type");
    }

    const users: User[] = [];
    snapshot?.forEach((doc) => {
      users.push({
        uId: doc.id,
        email: doc.data().email,
        name: doc.data().name,
      } as User);
    });
    return users;
  } catch (error) {
    console.error("Error while searching user! ", error);
    throw error;
  }
};
