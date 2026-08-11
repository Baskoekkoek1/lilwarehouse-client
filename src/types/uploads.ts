export type UploadStatus =
  | "PENDING"
  | "GETTING_URL"
  | "UPLOADING"
  | "FINALIZING"
  | "SUCCESS"
  | "ERROR";

export interface UploadTask {
  id: string;
  file: File;
  fileName: string;
  path: string;
  status: UploadStatus;
  progress: number;
  error?: string;
}

export interface UploadPayloadItem {
  file: File;
  path: string;
}
