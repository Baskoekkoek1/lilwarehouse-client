export interface UploadTask {
  id: string;
  file: File;
  fileName: string;
  path: string;
  status:
    | "PENDING"
    | "GETTING_URL"
    | "UPLOADING"
    | "FINALIZING"
    | "SUCCESS"
    | "ERROR";
  progress: number;
  error?: string;
}

export interface UploadPayloadItem {
  file: File;
  path: string;
}
