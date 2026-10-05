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

export function getFileIconColor(fileName: string, type: string): string {
  if (type === "folder") return "primary";

  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) {
    return "#2DD4BF"; // Teal / Image
  }
  if (["pdf", "doc", "docx", "txt", "md", "json", "csv", "xml"].includes(ext)) {
    return "#38BDF8"; // Sky Blue / Document & Code
  }
  if (["zip", "tar", "gz", "7z", "rar"].includes(ext)) {
    return "#F59E0B"; // Amber / Archive
  }
  if (["mp3", "wav", "mp4", "mkv", "avi", "mov"].includes(ext)) {
    return "#A855F7"; // Purple / Media
  }

  return "grey-lighten-1";
}
