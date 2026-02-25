export const formatBytes = (
  bytes: number | string | undefined,
  decimals = 2,
): string => {
  const numBytes = typeof bytes === "string" ? parseInt(bytes) : bytes;
  if (!numBytes || numBytes === 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(numBytes) / Math.log(k));

  return `${parseFloat((numBytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const formatDate = (date: string | Date | undefined): string => {
  if (!date) return "--";

  const d = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(d);
};
