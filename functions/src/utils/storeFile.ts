import {firebaseStorage} from "../config";
import {UploadedFile} from "../types";

export const storeFileToFirebaseStorage = async (
  file: UploadedFile
): Promise<{[key: string]: string} | undefined> => {
  const bucket = firebaseStorage.bucket();
  const filename = `${file.originalname}`;
  const fileUpload = bucket.file(filename).createWriteStream();
  file.stream.pipe(fileUpload);
  return new Promise<{[key: string]: string} | undefined>((resolve, reject) => {
    fileUpload.on("finish", async () => {
      const [fileMetadata] = await bucket.file(filename).getMetadata();
      const fileUrl = fileMetadata.mediaLink;
      resolve({[file.fieldName]: fileUrl});
    });

    fileUpload.on("error", (err) => {
      reject(err);
    });
  });
};
