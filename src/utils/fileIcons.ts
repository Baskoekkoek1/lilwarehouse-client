export const getFileIcon = (fileName: string, type: "file" | "folder") => {
  if (type === "folder") return "mdi-folder-outline";

  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "mdi-file-pdf-box";
    case "jpg":
    case "jpeg":
    case "png":
      return "mdi-image-outline";
    case "zip":
    case "rar":
      return "mdi-zip-box-outline";
    case "txt":
      return "mdi-file-document-outline";
    default:
      return "mdi-file-outline";
  }
};
