import {Router as router, Response, Request} from "express";
import {
  // bucket,
  countersCollection,
  db,
  packCollection,
  storiesCollection,
} from "../config/index";
import {statusCodes} from "../constants/statusCodes";
import {
  addStoryMiddleware,
  validatePackIdMiddleware,
  validateStoriesArrayMiddleware,
  validateStoryIdMiddleware,
} from "../middlewares/stories";
import {verifyTokenMiddleware} from "../middlewares/verifyToken";
import {Story} from "../types";
import {processFilesMiddleware} from "../middlewares/stories";
const expressRouter = router();

expressRouter.post(
  "/pack",
  verifyTokenMiddleware,
  addStoryMiddleware,
  validateStoriesArrayMiddleware,
  async (req: Request, res: Response) => {
    const {stories, publishingDate, publishingTime} = req.body;
    try {
      const counterDoc = await countersCollection.doc("packCounter").get();
      const storyCounterDoc =
      await countersCollection.doc("storyCounter").get();
      let uid = 1;
      let storyUId = 1;
      if (counterDoc.exists) {
        uid = counterDoc.data()?.value;
      }
      if (storyCounterDoc.exists) {
        storyUId = storyCounterDoc.data()?.value;
      }
      await db.runTransaction(async (transaction) => {
        const packRef = packCollection.doc(uid.toString());
        const storyIds: string[] = [];
        for (const story of stories) {
          const storyRef = storiesCollection.doc(storyUId.toString());
          const lowerCaseStoryName = story.storyName.toLowerCase();
          transaction.set(storyRef, {
            ...story,
            packId: packRef.id,
            lowerCaseStoryName: lowerCaseStoryName,
          });
          storyUId++;
          storyIds.push(storyRef.id);
        }
        transaction.set(packRef, {
          storyIds,
          publishingDate,
          publishingTime,
        });
        transaction.set(counterDoc.ref, {
          value: uid + 1,
        });
        transaction.set(storyCounterDoc.ref, {
          value: storyUId,
        });
      });
      res.json({success: true});
    } catch (error) {
      console.error("Error adding story:", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({error: "Internal Server Error"});
    }
  }
);

expressRouter.get(
  "/",
  verifyTokenMiddleware,
  async (req: Request, res: Response) => {
    try {
      const snapshot = await storiesCollection.get();
      const documents = snapshot.docs.map((doc) => doc.data());
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({error: "Error fetching documents"});
    }
  }
);

expressRouter.get(
  "/get-stories/:packId",
  verifyTokenMiddleware,
  validatePackIdMiddleware,
  async (req: Request, res: Response) => {
    const packId = req.params.packId;
    try {
      const storiesSnapshot = await storiesCollection
        .where("packId", "==", packId)
        .get();
      if (storiesSnapshot.empty) {
        res
          .status(statusCodes.NOT_FOUND)
          .json({message: "No stories found for this pack"});
        return;
      }
      const stories: Story[] = [];
      storiesSnapshot.forEach((doc) => {
        const storyData = doc.data();
        stories.push({storyId: doc.id, ...storyData} as Story);
      });
      res.json(stories);
    } catch (error) {
      console.error("Error while fetching stories: ", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error"});
    }
  }
);

expressRouter.get(
  "/search",
  verifyTokenMiddleware,
  async (req: Request, res: Response) => {
    try {
      const query = req.query.query;
      if (!query) {
        res
          .status(statusCodes.BAD_REQUEST)
          .json({message: "No query provided"});
        return;
      }
      const normalizedQuery = query.toString().toLowerCase().trim();
      const snapshot = await storiesCollection.get();
      const stories: Story[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (
          data.lowerCaseStoryName.includes(normalizedQuery) ||
          data.content.includes(normalizedQuery)) {
          stories.push({storyId: doc.id, ...data} as Story);
        }
      });
      res.json(stories);
    } catch (error) {
      console.error("Error while searching stories: ", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error!"});
    }
  }
);

expressRouter.delete(
  "/pack/:packId",
  verifyTokenMiddleware,
  validatePackIdMiddleware,
  async (req: Request, res: Response) => {
    try {
      const packId = req.params.packId;
      const packDoc = await packCollection.doc(packId).get();
      if (!packDoc.exists) {
        res.status(statusCodes.NOT_FOUND).json({message: "Pack not found!"});
        return;
      }
      await packDoc.ref.delete();
      const storiesSnapshot = await storiesCollection
        .where("packId", "==", packId)
        .get();
      const batch = db.batch();
      storiesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      res.json({message: "Pack and associated stories deleted successfully"});
    } catch (error) {
      console.error(
        "Error while deleteing pack and associated stories: ",
        error
      );
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal Server Error"});
    }
  }
);

expressRouter.delete(
  "/story/:storyId",
  verifyTokenMiddleware,
  validateStoryIdMiddleware,
  async (req: Request, res: Response) => {
    try {
      const storyId = req.params.storyId;
      const storyDoc = await storiesCollection.doc(storyId).get();
      if (!storyDoc.exists) {
        res.status(statusCodes.NOT_FOUND).json({message: "Story not found!"});
        return;
      }
      await storyDoc.ref.delete();
      const packSnapshot = await packCollection
        .where("storyIds", "array-contains", storyId)
        .get();
      const batch = db.batch();
      packSnapshot.forEach((packDoc) => {
        const updatedStoryIds = packDoc
          .data()
          .storyIds.filter((id: string) => id !== storyId);
        batch.update(packDoc.ref, {storyIds: updatedStoryIds});
      });
      await batch.commit();
      res.json({message: "Story deleted successfully"});
    } catch (error) {
      console.error("Error while deleteing story: ", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal Server Error"});
    }
  }
);

expressRouter.put(
  "/pack/:packId",
  verifyTokenMiddleware,
  validatePackIdMiddleware,
  validateStoriesArrayMiddleware,
  async (req: Request, res: Response) => {
    const packId = req.params.packId;
    const {stories, publishingDate, publishingTime} = req.body;
    try {
      const counterDoc = await countersCollection.doc("storyCounter").get();
      let storyUId = 1;
      if (counterDoc.exists) {
        storyUId = counterDoc.data()?.value;
      }
      await db.runTransaction(async (transaction) => {
        const packRef = packCollection.doc(packId);
        const packDoc = await packRef.get();
        if (!packDoc.exists) {
          res
            .status(statusCodes.NOT_FOUND)
            .json({message: "Pack not found!"});
          return;
        }
        const existingStoriesIds = packDoc.data()?.storyIds;
        const newStoryIds: string[] = [];
        for (const story of stories) {
          let storyRef;
          if (story.storyId) {
            storyRef = storiesCollection.doc(story.storyId);
          } else {
            storyRef = storiesCollection.doc(storyUId.toString());
            story.storyId = storyRef.id;
            storyUId++;
          }
          const lowerCaseStoryName = story.storyName.toLowerCase();
          transaction.set(storyRef, {
            ...story,
            packId: packRef.id,
            lowerCaseStoryName: lowerCaseStoryName,
          });
          newStoryIds.push(storyRef.id);
        }
        const storiesToDelete = existingStoriesIds.filter(
          (storyId: string) => !newStoryIds.includes(storyId)
        );
        for (const storyId of storiesToDelete) {
          const storyRefToDelete = storiesCollection.doc(storyId);
          transaction.delete(storyRefToDelete);
        }
        transaction.update(packRef, {
          storyIds: newStoryIds,
          publishingDate,
          publishingTime,
        });
        transaction.set(counterDoc.ref, {
          value: storyUId,
        });
      });
      res.json({success: true});
    } catch (error) {
      console.error("Error while editing pack: ", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error"});
    }
  }
);

expressRouter.get(
  "/next-story/:storyId",
  verifyTokenMiddleware,
  validateStoryIdMiddleware,
  async (req: Request, res: Response) => {
    const currentStoryId = req.params.storyId;
    try {
      const currentStoryDoc = await storiesCollection.doc(currentStoryId).get();
      if (!currentStoryDoc.exists) {
        res.status(statusCodes.NOT_FOUND).json({message: "Story not found!"});
        return;
      }
      const nextStoryQuerySnapshot = await storiesCollection
        .orderBy("__name__")
        .startAfter(currentStoryDoc.id)
        .limit(1)
        .get();
      if (nextStoryQuerySnapshot.empty) {
        res
          .status(statusCodes.NOT_FOUND)
          .json({message: "No next story available"});
        return;
      }
      const nextStoryDoc = nextStoryQuerySnapshot.docs[0];
      const nextStoryId = nextStoryDoc.id;
      const nextStoryData = nextStoryDoc.data();
      res.json({storyId: nextStoryId, nextStory: nextStoryData});
    } catch (error) {
      console.error("Error while retrieving next story:", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error"});
    }
  }
);

expressRouter.get(
  "/previous-story/:storyId",
  verifyTokenMiddleware,
  validateStoryIdMiddleware,
  async (req: Request, res: Response) => {
    const currentStoryId = req.params.storyId;
    try {
      const currentStoryDoc = await storiesCollection.doc(currentStoryId).get();
      if (!currentStoryDoc.exists) {
        res.status(statusCodes.NOT_FOUND).json({message: "Story not found!"});
        return;
      }
      const previousStoryQuerySnapshot = await storiesCollection
        .orderBy("__name__", "desc")
        .startAfter(currentStoryId)
        .limit(1)
        .get();
      if (previousStoryQuerySnapshot.empty) {
        res.status(statusCodes.NOT_FOUND)
          .json({message: "No previous story available"});
        return;
      }
      const previousStoryDoc = previousStoryQuerySnapshot.docs[0];
      const previousStoryId = previousStoryDoc.id;
      const previousStoryData = previousStoryDoc.data();
      res.json({storyId: previousStoryId, previousStory: previousStoryData});
    } catch (error) {
      console.error("Error while retrieving previous story:", error);
      res.status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error"});
    }
  }
);


expressRouter.get(
  "/packs",
  verifyTokenMiddleware,
  async (req: Request, res: Response) => {
    try {
      const snapshot = await packCollection.get();
      const documents = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          packId: doc.id,
          storyIds: data.storyIds,
        };
      });
      res.json({packs: documents});
    } catch (error) {
      console.error("Error while getting packs", error);
      res
        .status(statusCodes.INTERNAL_SERVER_ERR)
        .json({message: "Internal server error"});
    }
  }
);

expressRouter.post(
  "/upload/:storyId",
  processFilesMiddleware,
  async (req: Request, res: Response) => {
    try {
      const currentStoryId = req.params.storyId;
      const {files} = req.body;
      res.json(files);
      const currentStoryRef = storiesCollection.doc(currentStoryId);
      await currentStoryRef.update({
        media: files,
      });
    } catch (err) {
      res.status(statusCodes.BAD_REQUEST).json({error: JSON.stringify(err)});
    }
  }
);
export const storiesRouter = expressRouter;
