
import {Router as router, Request, Response} from "express";
import {db} from "../config/index";

const expressRouter = router();

// Route to get documents from Firestore
expressRouter.get("/documents", async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection("testdata").get();
    const documents = snapshot.docs.map((doc) => {
      doc.data();
    });
    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({error: "Error fetching documents"});
  }
});

expressRouter.post(
  "/documents",
  async (req: Request, res: Response) => {
    try {
      const data = req.body;
      await db.collection("testdata").add(data);
      res.status(201).json({message: "Document added successfully"});
    } catch (error) {
      console.error("Error adding document:", error);
      res.status(500).json({error: "Error adding document"});
    }
  }
);

export const dbRoutes = expressRouter;
