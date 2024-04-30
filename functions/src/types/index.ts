export interface Story {
  storyId: string;
  author: string;
  orderWithinPack: number;
  content: string;
  packId: string;
  paywall: boolean;
  sourceMaterials: string[];
  storyName: string;
  storyTags: string[];
  storyNotes?: string;
  lowerCaseStoryName? : string;
}

export interface User {
  uId : string,
  email: string,
  firstName?: string,
  lastName?:string
}

export interface UploadedFile {
  originalname: string;
  stream: NodeJS.ReadableStream;
  fieldName: string;
}
