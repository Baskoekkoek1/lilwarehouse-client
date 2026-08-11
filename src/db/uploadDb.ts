import Dexie, { type Table } from "dexie";

export interface UploadTaskRecord {
  id: string; // UUID or unique hash
  file: File; // Native browser File object stored on disk
  fileName: string;
  path: string;
  fileSize: number;
  mimeType: string;
  status:
    | "PENDING"
    | "GETTING_URL"
    | "UPLOADING"
    | "FINALIZING"
    | "SUCCESS"
    | "ERROR"
    | "COMPLETED"
    | "FAILED";
  progress: number;
  retryCount: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

class UploadDatabase extends Dexie {
  upload_tasks!: Table<UploadTaskRecord, string>;

  constructor() {
    super("LilWarehouseUploads");

    this.version(1).stores({
      upload_tasks: "id, status, path, createdAt",
    });
  }
}

export const uploadDb = new UploadDatabase();
